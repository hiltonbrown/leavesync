"use client";

import type { TenantSummary } from "@repo/availability";
import type {
  XeroConnection,
  XeroTenant,
} from "@repo/database/generated/client";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import Link from "next/link";
import { ProviderStatusBadge } from "../components/provider-status-badge";
import { SettingsSectionHeader } from "../components/settings-section-header";

interface IntegrationsClientProps {
  summary: null | TenantSummary;
  xeroConnection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
}

export const IntegrationsClient = ({
  summary,
  xeroConnection,
}: IntegrationsClientProps) => {
  let status: "connected" | "disconnected" | "expired" | "revoked";
  if (summary) {
    if (summary.connectionStatus === "active") {
      status = "connected";
    } else if (summary.connectionStatus === "not_configured") {
      status = "disconnected";
    } else {
      status = summary.connectionStatus;
    }
  } else if (xeroConnection) {
    status = "revoked";
  } else {
    status = "disconnected";
  }

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Connect external services to extend LeaveSync."
        title="Integrations"
      />

      <div className="rounded-2xl bg-muted/40 p-4 text-sm">
        LeaveSync works without any integrations. Connect Xero to enable leave
        submission for approval and automatic balance sync.
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Xero Payroll</CardTitle>
              <CardDescription>
                Real connection state for this organisation.
              </CardDescription>
            </div>
            <ProviderStatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary && (
            <div className="grid gap-3 md:grid-cols-3">
              <Stat
                label="Last sync"
                value={
                  summary.lastRun?.completedAt?.toLocaleString("en-AU") ??
                  "Not run yet"
                }
              />
              <Stat
                label="Synced people"
                value={String(summary.lastRun?.recordsUpserted ?? 0)}
              />
              <Stat
                label="Pending failed records"
                value={String(summary.pendingFailedRecords)}
              />
            </div>
          )}
          {xeroConnection?.xero_tenant && (
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              Tenant:{" "}
              {xeroConnection.xero_tenant.tenant_name ??
                xeroConnection.xero_tenant.xero_tenant_id}
            </div>
          )}
          <Button asChild>
            <Link href="/settings/integrations/xero">
              {xeroConnection ? "Manage" : "Connect"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {["MYOB", "QuickBooks", "Slack", "Microsoft Teams"].map((name) => (
        <Card className="rounded-2xl opacity-70" key={name}>
          <CardHeader>
            <CardTitle>{name}</CardTitle>
            <CardDescription>Coming soon.</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
