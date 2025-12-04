import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, QrCode } from "lucide-react";
import { QRScanner } from "./QRScanner";

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
    // Try to parse the scanned data - could be just an ID number or JSON
    let idNumber = scannedData;
    
    try {
      const parsed = JSON.parse(scannedData);
      if (parsed.id_number) idNumber = parsed.id_number;
      if (parsed.name) setFormData(prev => ({ ...prev, name: parsed.name }));
      if (parsed.email) setFormData(prev => ({ ...prev, email: parsed.email }));
      if (parsed.phone) setFormData(prev => ({ ...prev, phone: parsed.phone }));
      if (parsed.organization) setFormData(prev => ({ ...prev, organization: parsed.organization }));
    } catch {
      // Not JSON, treat as plain ID number
    }

    setFormData(prev => ({ ...prev, id_number: idNumber }));
    toast.info("ID scanned. Please complete the guest information.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      toast.error("No active session found");
      return;
    }

    setLoading(true);

    try {
      // Create guest
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          id_number: formData.id_number || null,
          organization: formData.organization || null,
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-organization">Organization</Label>
              <Input
                id="guest-organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Enter organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-id">ID Number</Label>
              <div className="flex gap-2">
                <Input
                  id="guest-id"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  placeholder="Enter or scan ID number"
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone</Label>
                <Input
                  id="guest-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
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
