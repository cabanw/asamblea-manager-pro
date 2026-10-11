import { serve } from "https://deno.land/std/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateVoterPin = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// v2.0: votación desactivada para el evento en vivo. Cambiar a true para reactivar en v2.1.
const VOTING_ENABLED = false;

const GENERIC_ERROR = "No se pudo completar el registro";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Nunca devolver error.message de Postgres al cliente: el detalle va al log de la función.
const fail = (context: string, error: unknown) => {
  console.error(`register-attendance: ${context}`, error);
  return json({ error: GENERIC_ERROR }, 500);
};

type MemberMatch = {
  id: string;
  name: string;
  is_active: boolean | null;
  positions: { name: string } | null;
};

// Comparación de nombres tolerante a mayúsculas, acentos y espacios extra.
const normalizeName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Busca en la matrícula por id_number y, como respaldo, por phone, y exige además que el
// nombre coincida. Los id_number son cortos y casi secuenciales: sin el chequeo de nombre,
// un anónimo con el enlace podría marcar presentes a ministros ausentes (inflando el quórum)
// o enumerar la matrícula. Nunca crea miembros ni escribe en members.
async function findRosterMember(
  db: SupabaseClient,
  idNumber: string | null,
  phone: string,
  name: string,
): Promise<MemberMatch | null> {
  const select = "id, name, is_active, positions:position_id (name)";
  const wanted = normalizeName(name);
  const nameMatches = (m: MemberMatch) => normalizeName(m.name) === wanted;

  if (idNumber) {
    const { data, error } = await db.from("members").select(select).eq("id_number", idNumber).maybeSingle();
    if (error) throw error;
    if (data && nameMatches(data as unknown as MemberMatch)) return data as unknown as MemberMatch;
  }

  // limit(2): si dos miembros comparten teléfono no adivinamos cuál es
  const { data, error } = await db.from("members").select(select).eq("phone", phone).limit(2);
  if (error) throw error;
  if (data && data.length === 1 && nameMatches(data[0] as unknown as MemberMatch)) {
    return data[0] as unknown as MemberMatch;
  }

  return null;
}

// Reutiliza al invitado si ya existe con ese teléfono y nombre, para que el chequeo de
// doble check-in funcione también con invitados (si no, cada envío sería un guest nuevo).
// Exigir el nombre evita registrar asistencia a nombre de otro invitado con solo su teléfono.
async function findOrCreateGuest(
  db: SupabaseClient,
  name: string,
  phone: string,
  idNumber: string | null,
): Promise<string> {
  const { data: candidates, error: findError } = await db
    .from("guests")
    .select("id, name")
    .eq("phone", phone)
    .order("created_at", { ascending: true });
  if (findError) throw findError;
  const existing = (candidates || []).find((g) => normalizeName(g.name) === normalizeName(name));
  if (existing) return existing.id;

  const { data: guest, error: insertError } = await db
    .from("guests")
    .insert({ name, phone, id_number: idNumber })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return guest.id;
}

async function isAlreadyRegistered(
  db: SupabaseClient,
  sessionId: string,
  column: "member_id" | "guest_id",
  id: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("attendance_records")
    .select("id")
    .eq("session_id", sessionId)
    .eq(column, id)
    .limit(1);
  if (error) throw error;
  return !!data && data.length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return fail("missing environment variables", null);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // position_id del cliente se ignora a propósito: el cargo sale solo de la matrícula.
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 20) : "";
    const idNumber = typeof body.id_number === "string" && body.id_number.trim()
      ? body.id_number.trim().slice(0, 50)
      : null;
    const type = body.type;

    if (!token || !name || !phone || (type !== "member" && type !== "guest")) {
      return json({ error: "Token, name, phone, and type are required" }, 400);
    }

    const { data: link, error: linkError } = await supabaseAdmin
      .from("assembly_registration_links")
      .select("assembly_id, expires_at")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return json({ error: "Invalid or expired token" }, 404);
    }

    if (new Date(link.expires_at) < new Date()) {
      return json({ error: "Registration link has expired" }, 400);
    }

    const sessionId: string = link.assembly_id;

    // --- Miembro: solo si está en la matrícula ---
    if (type === "member") {
      // No se rellena members.phone desde aquí: sería una escritura anónima persistente
      // (un tercero podría asociar su teléfono a un ministro y recibir su PIN por SMS).
      const member = await findRosterMember(supabaseAdmin, idNumber, phone, name);

      if (member) {
        if (await isAlreadyRegistered(supabaseAdmin, sessionId, "member_id", member.id)) {
          return json({ success: true, alreadyRegistered: true });
        }

        const isActive = member.is_active ?? true;

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
          session_id: sessionId,
          attendee_type: "member",
          member_id: member.id,
          is_present: true,
          voter_pin,
        });
        if (insertError) return fail("member attendance insert", insertError);

        if (voter_pin) {
          await sendSms(phone, `Su PIN de registro para la asamblea es: ${voter_pin}. Guárdelo para votar.`);
        }

        return json({
          success: true,
          voter_pin,
          positionName: member.positions?.name ?? "Miembro",
          is_active: isActive,
        });
      }
      // No está en la matrícula (o el nombre no coincide): cae al camino de invitado
      // (sin voto, no cuenta en quórum). La respuesta es la misma que para un desconocido,
      // así que no revela si el id_number/phone existe en la matrícula.
    }

    // --- Invitado (elegido o miembro no encontrado) ---
    const guestId = await findOrCreateGuest(supabaseAdmin, name, phone, idNumber);

    if (await isAlreadyRegistered(supabaseAdmin, sessionId, "guest_id", guestId)) {
      return json({ success: true, alreadyRegistered: true });
    }

    const { error: attendanceError } = await supabaseAdmin.from("attendance_records").insert({
      session_id: sessionId,
      attendee_type: "guest",
      guest_id: guestId,
      is_present: true,
    });
    if (attendanceError) return fail("guest attendance insert", attendanceError);

    return json({
      success: true,
      positionName: "Invitado",
      treatedAsGuest: type === "member",
    });
  } catch (error: unknown) {
    return fail("unhandled", error);
  }
});
