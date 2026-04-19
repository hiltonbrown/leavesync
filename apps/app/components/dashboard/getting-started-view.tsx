import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { withOrg } from "@/lib/navigation/org-url";

interface GettingStartedViewProps {
  orgQueryValue: string | null;
}

export function GettingStartedView({ orgQueryValue }: GettingStartedViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-muted p-6">
        <h2 className="font-semibold text-2xl tracking-tight">
          Welcome to LeaveSync
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Your organisation is set up. Follow these steps to start publishing
          availability to your team.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Step 1
          </p>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">Connect Xero</h3>
            <p className="text-muted-foreground text-sm">
              Link your Xero payroll file so LeaveSync can sync your employees
              and their approved leave.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={withOrg("/settings/integrations/xero", orgQueryValue)}>
              Connect Xero
            </Link>
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-6 opacity-50">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Step 2
          </p>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">
              Employees sync automatically
            </h3>
            <p className="text-muted-foreground text-sm">
              Once connected, LeaveSync imports your people and their approved
              leave from Xero. No manual data entry needed.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-6 opacity-50">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Step 3
          </p>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">Publish calendar feeds</h3>
            <p className="text-muted-foreground text-sm">
              Create stable ICS feeds your team can subscribe to in Google
              Calendar, Outlook, or Apple Calendar.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-muted-foreground text-sm">
        Not using Xero?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={withOrg("/people/new", orgQueryValue)}
        >
          Add people manually instead
        </Link>
      </p>
    </div>
  );
}
