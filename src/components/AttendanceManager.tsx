import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCheck, UserX, Users, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AttendanceManagerProps {
  sessionId: string | undefined;
  onUpdate: () => void;
}

export const AttendanceManager = ({ sessionId, onUpdate }: AttendanceManagerProps) => {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadAttendees();
    }
  }, [sessionId]);

  const loadAttendees = async () => {
    if (!sessionId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("attendance_records")
      .select(`
        *,
        members:member_id (name, position_id, positions:position_id (name)),
        guests:guest_id (name, organization)
      `)
      .eq("session_id", sessionId)
      .order("check_in_time", { ascending: false });

    if (error) {
      toast.error("Failed to load attendance");
    } else {
      setAttendees(data || []);
    }
    setLoading(false);
  };

  const togglePresence = async (recordId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("attendance_records")
      .update({
        is_present: !currentStatus,
        check_out_time: !currentStatus ? null : new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) {
      toast.error("Failed to update attendance");
    } else {
      toast.success(currentStatus ? "Marked as left" : "Marked as present");
      loadAttendees();
      onUpdate();
    }
  };

  const members = attendees.filter((a) => a.attendee_type === "member");
  const guests = attendees.filter((a) => a.attendee_type === "guest");

  const AttendeeCard = ({ attendee }: { attendee: any }) => {
    const isGuest = attendee.attendee_type === "guest";
    const name = isGuest ? attendee.guests?.name : attendee.members?.name;
    const subtitle = isGuest
      ? attendee.guests?.organization
      : attendee.members?.positions?.name;

    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{name}</h4>
                {attendee.is_present ? (
                  <Badge variant="default" className="bg-success">
                    Present
                  </Badge>
                ) : (
                  <Badge variant="secondary">Left</Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Check-in: {new Date(attendee.check_in_time).toLocaleTimeString()}
              </p>
              {attendee.check_out_time && (
                <p className="text-xs text-muted-foreground">
                  Check-out: {new Date(attendee.check_out_time).toLocaleTimeString()}
                </p>
              )}
            </div>
            <Button
              variant={attendee.is_present ? "destructive" : "default"}
              size="sm"
              onClick={() => togglePresence(attendee.id, attendee.is_present)}
            >
              {attendee.is_present ? (
                <>
                  <UserX className="h-4 w-4 mr-1" />
                  Mark Left
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-1" />
                  Mark Present
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Attendance Management</CardTitle>
        <CardDescription>
          Track member and guest presence throughout the session
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger value="guests">
                <UserPlus className="h-4 w-4 mr-2" />
                Guests ({guests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-3 mt-4">
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members registered yet
                </div>
              ) : (
                members.map((attendee) => (
                  <AttendeeCard key={attendee.id} attendee={attendee} />
                ))
              )}
            </TabsContent>

            <TabsContent value="guests" className="space-y-3 mt-4">
              {guests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No guests registered yet
                </div>
              ) : (
                guests.map((attendee) => (
                  <AttendeeCard key={attendee.id} attendee={attendee} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
