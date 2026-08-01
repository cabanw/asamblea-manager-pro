import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateVoterPin = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// v2.0: votación desactivada para el evento en vivo. Cambiar a true para reactivar en v2.1.
const VOTING_ENABLED = false;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { token, name, phone, id_number, type, position_id } = await req.json();

    if (!token || !name || !phone || !type) {
      return new Response(JSON.stringify({ error: "Token, name, phone, and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: link, error: linkError } = await supabaseAdmin
      .from("assembly_registration_links")
      .select("assembly_id, expires_at")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Registration link has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Guest path: no member lookup, no voting rights ---
    if (type === "guest") {
      const { data: guest, error: guestError } = await supabaseAdmin
        .from("guests")
        .insert({ name, phone, id_number: id_number || null })
        .select("id")
        .single();

      if (guestError) {
        return new Response(JSON.stringify({ error: guestError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: attendanceError } = await supabaseAdmin.from("attendance_records").insert({
        session_id: link.assembly_id,
        attendee_type: "guest",
        guest_id: guest.id,
        is_present: true,
      });

      if (attendanceError) {
        return new Response(JSON.stringify({ error: attendanceError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, positionName: "Invitado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Member path: cross-check against the real members table ---
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id, is_active")
      .eq("phone", phone)
      .maybeSingle();

    let memberId: string;
    let isActive = true;

    if (existingMember) {
      memberId = existingMember.id;
      isActive = existingMember.is_active ?? true;
    } else {
      const { data: newMember, error: memberError } = await supabaseAdmin
        .from("members")
        .insert({
          name,
          phone,
          id_number: id_number || null,
          position_id: position_id || null,
        })
        .select("id, is_active")
        .single();

      if (memberError) {
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      memberId = newMember.id;
      isActive = newMember.is_active ?? true;
    }

    let positionName = "Miembro";
    if (position_id) {
      const { data: position } = await supabaseAdmin
        .from("positions")
        .select("name")
        .eq("id", position_id)
        .maybeSingle();
      if (position) positionName = position.name;
    }

    // Inactive members attend but don't get a voter PIN (no voting rights)
    // With VOTING_ENABLED false, nobody gets a PIN during v2.0
    let voter_pin: string | null = null;
    if (VOTING_ENABLED && isActive) {
      voter_pin = generateVoterPin();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabaseAdmin
          .from("attendance_records")
          .select("id")
          .eq("voter_pin", voter_pin)
          .maybeSingle();
        if (!existing) break;
        voter_pin = generateVoterPin();
      }
    }

    const { error: insertError } = await supabaseAdmin.from("attendance_records").insert({
      session_id: link.assembly_id,
      attendee_type: "member",
      member_id: memberId,
      is_present: true,
      voter_pin,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voter_pin) {
      await sendSms(phone, `Su PIN de registro para la asamblea es: ${voter_pin}. Guárdelo para votar.`);
    }

    return new Response(
      JSON.stringify({ success: true, voter_pin, positionName, is_active: isActive }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
