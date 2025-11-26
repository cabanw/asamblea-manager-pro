import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuorumStatusProps {
  presentMembers: number;
  totalMembers: number;
  quorumRequired: number;
  quorumAchieved: boolean;
}

export const QuorumStatus = ({
  presentMembers,
  totalMembers,
  quorumRequired,
  quorumAchieved,
}: QuorumStatusProps) => {
  const percentage = totalMembers > 0 ? (presentMembers / totalMembers) * 100 : 0;
  const membersNeeded = Math.max(0, Math.ceil((quorumRequired / 100) * totalMembers) - presentMembers);

  return (
    <Card className={cn(
      "p-8 shadow-xl transition-all duration-300",
      quorumAchieved 
        ? "bg-gradient-to-br from-success/10 to-success/5 border-success/50" 
        : "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/50"
    )}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Quorum Status</h2>
            <p className="text-muted-foreground">
              {quorumRequired}% attendance required ({Math.ceil((quorumRequired / 100) * totalMembers)} members)
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-semibold",
            quorumAchieved 
              ? "bg-success text-success-foreground" 
              : "bg-warning text-warning-foreground"
          )}>
            {quorumAchieved ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Quorum Achieved
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                No Quorum
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Present: {presentMembers} / {totalMembers}</span>
            <span className="font-bold">{percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={percentage} 
            className={cn(
              "h-4",
              quorumAchieved ? "[&>div]:bg-success" : "[&>div]:bg-warning"
            )} 
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0%</span>
            <span className="font-medium">Required: {quorumRequired}%</span>
            <span>100%</span>
          </div>
        </div>

        {!quorumAchieved && membersNeeded > 0 && (
          <div className="bg-background/50 rounded-lg p-4 border">
            <p className="text-sm text-center">
              <span className="font-semibold text-warning">{membersNeeded}</span> more member{membersNeeded !== 1 ? 's' : ''} needed to achieve quorum
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
