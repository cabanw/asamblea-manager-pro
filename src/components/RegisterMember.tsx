import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, QrCode } from "lucide-react";
import { QRScanner } from "./QRScanner";

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
    // Try to parse the scanned data - could be just an ID number or JSON
    let idNumber = scannedData;
    
    try {
      const parsed = JSON.parse(scannedData);
      if (parsed.id_number) idNumber = parsed.id_number;
      if (parsed.name) setFormData(prev => ({ ...prev, name: parsed.name }));
      if (parsed.email) setFormData(prev => ({ ...prev, email: parsed.email }));
      if (parsed.phone) setFormData(prev => ({ ...prev, phone: parsed.phone }));
    } catch {
      // Not JSON, treat as plain ID number
    }

    setFormData(prev => ({ ...prev, id_number: idNumber }));

    // Try to find existing member
    const { data: existingMember } = await supabase
      .from("members")
      .select("*")
      .eq("id_number", idNumber)
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

    setLoading(true);

    try {
      // Check if member already exists
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("id_number", formData.id_number)
        .maybeSingle();

      let memberId = existingMember?.id;

      if (!existingMember) {
        // Create new member
        const { data: newMember, error: memberError } = await supabase
          .from("members")
          .insert({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            id_number: formData.id_number,
            position_id: formData.position_id || null,
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
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  placeholder="Enter or scan ID number"
                  required
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-phone">Phone</Label>
                <Input
                  id="member-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
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
