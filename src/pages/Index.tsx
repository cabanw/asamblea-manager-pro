import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { QuorumStatus } from "@/components/QuorumStatus";
import { RegisterMember } from "@/components/RegisterMember";
import { RegisterGuest } from "@/components/RegisterGuest";
import { AttendanceManager } from "@/components/AttendanceManager";
import { ReportsSection } from "@/components/ReportsSection";

const Index = () => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalGuests: 0,
    presentMembers: 0,
    presentGuests: 0,
    quorumRequired: 50,
    quorumAchieved: false,
  });

  useEffect(() => {
    loadActiveSession();
    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("attendance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActiveSession = async () => {
    const { data } = await supabase
      .from("assembly_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      // Create a new session if none exists
      const { data: newSession } = await supabase
        .from("assembly_sessions")
        .insert({
          name: `Assembly Session ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString().split("T")[0],
          quorum_required: 50,
          status: "active",
        })
        .select()
        .single();

      setActiveSession(newSession);
    } else {
      setActiveSession(data);
    }
  };

  const loadStats = async () => {
    // Get total active members
    const { count: totalMembers } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Get active session
    const { data: session } = await supabase
      .from("assembly_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return;

    // Get present members count
    const { count: presentMembers } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("attendee_type", "member")
      .eq("is_present", true);

    // Get present guests count
    const { count: presentGuests } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("attendee_type", "guest")
      .eq("is_present", true);

    // Get total guests registered for this session
    const { count: totalGuests } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("attendee_type", "guest");

    const quorumPercentage = totalMembers
      ? ((presentMembers || 0) / totalMembers) * 100
      : 0;

    setStats({
      totalMembers: totalMembers || 0,
      totalGuests: totalGuests || 0,
      presentMembers: presentMembers || 0,
      presentGuests: presentGuests || 0,
      quorumRequired: session.quorum_required,
      quorumAchieved: quorumPercentage >= session.quorum_required,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Assembly Management System
          </h1>
          <p className="text-muted-foreground text-lg">
            Track attendance, manage quorum, and generate reports
          </p>
        </div>

        {/* Quorum Status */}
        <QuorumStatus
          presentMembers={stats.presentMembers}
          totalMembers={stats.totalMembers}
          quorumRequired={stats.quorumRequired}
          quorumAchieved={stats.quorumAchieved}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 shadow-lg border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-3xl font-bold text-primary">{stats.totalMembers}</p>
              </div>
              <Users className="h-10 w-10 text-primary/60" />
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-l-4 border-l-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Members</p>
                <p className="text-3xl font-bold text-accent">{stats.presentMembers}</p>
              </div>
              <UserCheck className="h-10 w-10 text-accent/60" />
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-l-4 border-l-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-3xl font-bold text-warning">{stats.totalGuests}</p>
              </div>
              <UserPlus className="h-10 w-10 text-warning/60" />
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-l-4 border-l-success">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Guests</p>
                <p className="text-3xl font-bold text-success">{stats.presentGuests}</p>
              </div>
              {stats.quorumAchieved ? (
                <CheckCircle2 className="h-10 w-10 text-success/60" />
              ) : (
                <XCircle className="h-10 w-10 text-success/60" />
              )}
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mx-auto">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegisterMember sessionId={activeSession?.id} onSuccess={loadStats} />
              <RegisterGuest sessionId={activeSession?.id} onSuccess={loadStats} />
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceManager sessionId={activeSession?.id} onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsSection sessionId={activeSession?.id} stats={stats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
