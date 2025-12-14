import { useState, useEffect } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, QrCode } from "lucide-react";
import { QRScanner } from "./QRScanner";

// Validation schemas
const memberFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  id_number: z.string().trim().min(1, "ID number is required").max(50, "ID must be less than 50 characters"),
  position_id: z.string().uuid("Invalid position").optional().or(z.literal("")),
});

const qrDataSchema = z.object({
  id_number: z.string().max(50).optional(),
  name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
}).passthrough();

interface RegisterMemberProps {
  sessionId: string | undefined;
  onSuccess: () => void;
}

export const RegisterMember = ({ sessionId, onSuccess }: RegisterMemberProps) => {
  const [positions, setPositions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    id_number: "",
    position_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    const { data } = await supabase.from("positions").select("*").order("name");
    if (data) setPositions(data);
  };

  const handleQRScan = async (scannedData: string) => {
    // Limit raw scanned data length to prevent DoS
    const sanitizedData = scannedData.slice(0, 1000);
    let idNumber = sanitizedData;
    
    try {
      const rawParsed = JSON.parse(sanitizedData);
      // Validate parsed QR data
      const parsed = qrDataSchema.safeParse(rawParsed);
      
      if (parsed.success) {
        if (parsed.data.id_number) idNumber = parsed.data.id_number;
        if (parsed.data.name) setFormData(prev => ({ ...prev, name: parsed.data.name! }));
        if (parsed.data.email) setFormData(prev => ({ ...prev, email: parsed.data.email! }));
        if (parsed.data.phone) setFormData(prev => ({ ...prev, phone: parsed.data.phone! }));
      }
    } catch {
      // Not JSON, treat as plain ID number - limit length
      idNumber = sanitizedData.slice(0, 50);
    }

    setFormData(prev => ({ ...prev, id_number: idNumber.slice(0, 50) }));

    // Try to find existing member
    const { data: existingMember } = await supabase
      .from("members")
      .select("*")
      .eq("id_number", idNumber.slice(0, 50))
      .maybeSingle();

    if (existingMember) {
      setFormData({
        name: existingMember.name,
        email: existingMember.email || "",
        phone: existingMember.phone || "",
        id_number: existingMember.id_number || "",
        position_id: existingMember.position_id || "",
      });
      toast.success("Member found! Review and submit to check-in.");
    } else {
      toast.info("New member. Please complete the registration form.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      toast.error("No active session found");
      return;
    }

    // Validate form data
    const validationResult = memberFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const validatedData = validationResult.data;
    setLoading(true);

    try {
      // Check if member already exists
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("id_number", validatedData.id_number)
        .maybeSingle();

      let memberId = existingMember?.id;

      if (!existingMember) {
        // Create new member with validated data
        const { data: newMember, error: memberError } = await supabase
          .from("members")
          .insert({
            name: validatedData.name,
            email: validatedData.email || null,
            phone: validatedData.phone || null,
            id_number: validatedData.id_number,
            position_id: validatedData.position_id || null,
          })
          .select()
          .single();

        if (memberError) throw memberError;
        memberId = newMember.id;
      }

      // Check if already registered for this session
      const { data: existingAttendance } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("session_id", sessionId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (existingAttendance) {
        toast.error("Member already registered for this session");
        setLoading(false);
        return;
      }

      // Register attendance
      const { error: attendanceError } = await supabase
        .from("attendance_records")
        .insert({
          session_id: sessionId,
          attendee_type: "member",
          member_id: memberId,
          is_present: true,
        });

      if (attendanceError) throw attendanceError;

      toast.success("Member registered successfully!");
      setFormData({ name: "", email: "", phone: "", id_number: "", position_id: "" });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to register member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register Member
          </CardTitle>
          <CardDescription>Add or check-in an existing member</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-id">ID Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="member-id"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value.slice(0, 50) })}
                  placeholder="Enter or scan ID number"
                  required
                  maxLength={50}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-name">Full Name *</Label>
              <Input
                id="member-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                placeholder="Enter full name"
                required
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.slice(0, 255) })}
                  placeholder="email@example.com"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-phone">Phone</Label>
                <Input
                  id="member-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.slice(0, 20) })}
                  placeholder="+1234567890"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-position">Position</Label>
              <Select
                value={formData.position_id}
                onValueChange={(value) => setFormData({ ...formData, position_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "Registering..." : "Register Member"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
        title="Scan Member ID"
      />
    </>
  );
};
