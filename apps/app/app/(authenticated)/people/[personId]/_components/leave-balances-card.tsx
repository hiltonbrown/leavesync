import { AlertCircleIcon } from "lucide-react";

interface LeaveBalance {
  leaveTypeXeroId: string;
  balance: number;
}

interface LeaveBalancesCardProps {
  balances: LeaveBalance[];
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  "Annual Leave": "Annual",
  "Sick Leave": "Sick",
  "Parental Leave": "Parental",
  "Long Service Leave": "LSL",
};

export function LeaveBalancesCard({ balances }: LeaveBalancesCardProps) {
  if (balances.length === 0) {
    return (
      <div className="rounded-2xl bg-muted p-6">
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Leave Balances
          </p>
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertCircleIcon className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No leave balances available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Leave Balances
        </p>

        <div className="space-y-3">
          {balances.map((balance) => (
            <div
              key={balance.leaveTypeXeroId}
              className="flex items-center justify-between rounded-lg bg-background p-3"
            >
              <p className="text-sm font-medium">
                {LEAVE_TYPE_LABELS[balance.leaveTypeXeroId] ||
                  balance.leaveTypeXeroId}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {balance.balance.toFixed(1)} days
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
