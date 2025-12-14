import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, QrCode } from "lucide-react";
import { QRScanner } from "./QRScanner";

// Validation schemas
const guestFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().max(255, "Email must be less than 255 characters").email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  id_number: z.string().trim().max(50, "ID must be less than 50 characters").optional().or(z.literal("")),
  organization: z.string().trim().max(100, "Organization must be less than 100 characters").optional().or(z.literal("")),
});

const qrDataSchema = z.object({
  id_number: z.string().max(50).optional(),
  name: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  organization: z.string().max(100).optional(),
}).passthrough();

interface RegisterGuestProps {
  sessionId: string | undefined;
  onSuccess: () => void;
}

export const RegisterGuest = ({ sessionId, onSuccess }: RegisterGuestProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    id_number: "",
    organization: "",
  });
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleQRScan = (scannedData: string) => {
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
        if (parsed.data.organization) setFormData(prev => ({ ...prev, organization: parsed.data.organization! }));
      }
    } catch {
      // Not JSON, treat as plain ID number - limit length
      idNumber = sanitizedData.slice(0, 50);
    }

    setFormData(prev => ({ ...prev, id_number: idNumber.slice(0, 50) }));
    toast.info("ID scanned. Please complete the guest information.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      toast.error("No active session found");
      return;
    }

    // Validate form data
    const validationResult = guestFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const validatedData = validationResult.data;
    setLoading(true);

    try {
      // Create guest with validated data
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .insert({
          name: validatedData.name,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          id_number: validatedData.id_number || null,
          organization: validatedData.organization || null,
        })
        .select()
        .single();

      if (guestError) throw guestError;

      // Register attendance
      const { error: attendanceError } = await supabase
        .from("attendance_records")
        .insert({
          session_id: sessionId,
          attendee_type: "guest",
          guest_id: guest.id,
          is_present: true,
        });

      if (attendanceError) throw attendanceError;

      toast.success("Guest registered successfully!");
      setFormData({ name: "", email: "", phone: "", id_number: "", organization: "" });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to register guest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Register Guest
          </CardTitle>
          <CardDescription>Add a new guest to the assembly</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Full Name *</Label>
              <Input
                id="guest-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                placeholder="Enter full name"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-organization">Organization</Label>
              <Input
                id="guest-organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value.slice(0, 100) })}
                placeholder="Enter organization"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-id">ID Number</Label>
              <div className="flex gap-2">
                <Input
                  id="guest-id"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value.slice(0, 50) })}
                  placeholder="Enter or scan ID number"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.slice(0, 255) })}
                  placeholder="email@example.com"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone</Label>
                <Input
                  id="guest-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.slice(0, 20) })}
                  placeholder="+1234567890"
                  maxLength={20}
                />
              </div>
            </div>

            <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
              <Users className="mr-2 h-4 w-4" />
              {loading ? "Registering..." : "Register Guest"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
        title="Scan Guest ID"
      />
    </>
  );
};
