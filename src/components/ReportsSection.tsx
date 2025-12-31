import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface ReportsSectionProps {
  sessionId: string | undefined;
  stats: any;
}

export const ReportsSection = ({ sessionId, stats }: ReportsSectionProps) => {
  const generateReport = (format: "pdf" | "excel") => {
    // This is a placeholder - actual implementation would require a backend service
    toast.info(`${format.toUpperCase()} report generation will be implemented with a backend service`);
  };

  const membersNeededForQuorum = Math.ceil((2 / 3) * stats.totalMembers);
  const membersNeeded = Math.max(0, membersNeededForQuorum - stats.presentMembers);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Summary
          </CardTitle>
          <CardDescription>Current assembly session statistics</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Present Members</p>
              <p className="text-2xl font-bold text-primary">{stats.presentMembers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Guests</p>
              <p className="text-2xl font-bold">{stats.totalGuests}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Present Guests</p>
              <p className="text-2xl font-bold text-accent">{stats.presentGuests}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Quorum Status</p>
              <p className={`text-2xl font-bold ${stats.quorumAchieved ? "text-success" : "text-warning"}`}>
                {stats.quorumAchieved ? "Achieved" : "Not Achieved"}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.quorumAchieved
                  ? `Quorum was achieved with ${stats.presentMembers} of ${membersNeededForQuorum} members present.`
                  : `${membersNeeded} more member${membersNeeded !== 1 ? 's' : ''} needed for quorum (${membersNeededForQuorum} required).`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </CardTitle>
          <CardDescription>Download attendance and quorum reports</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <Button
              className="w-full"
              variant="default"
              onClick={() => generateReport("pdf")}
              disabled={!sessionId}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF Report
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => generateReport("excel")}
              disabled={!sessionId}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Reports will include:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Complete attendance list</li>
              <li>• Member positions breakdown</li>
              <li>• Guest information</li>
              <li>• Quorum calculation details</li>
              <li>• Check-in/out timestamps</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
