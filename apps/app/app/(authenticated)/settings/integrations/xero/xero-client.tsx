"use client";

import type { RunListItem, TenantSummary } from "@repo/availability";
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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { toast } from "@repo/design-system/components/ui/sonner";
import { useState, useTransition } from "react";
import { dispatchManualSyncAction } from "@/app/(authenticated)/sync/_actions";
import { ProviderStatusBadge } from "../../components/provider-status-badge";
import { SettingsSectionHeader } from "../../components/settings-section-header";
import {
  connectXeroAction,
  disconnectXeroAction,
  pauseTenantSyncAction,
  refreshXeroConnectionAction,
  resumeTenantSyncAction,
} from "./_actions";

interface XeroClientProps {
  connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
  organisationId: string;
  organisationName: string;
  recentRuns: RunListItem[];
  summaries: TenantSummary[];
}

export const XeroClient = ({
  connection,
  organisationId,
  organisationName,
  recentRuns,
  summaries,
}: XeroClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [confirmationText, setConfirmationText] = useState("");

  const handleConnect = (organisationId: string) => {
    startTransition(async () => {
      const result = await connectXeroAction({ organisationId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      window.location.href = result.value.redirectUrl;
    });
  };

  const handleRefresh = (connectionId: string, organisationId: string) => {
    startTransition(async () => {
      const result = await refreshXeroConnectionAction({
        connectionId,
        organisationId,
      });
      toast[result.ok ? "success" : "error"](
        result.ok ? "Connection refreshed." : result.error.message
      );
    });
  };

  const handleDisconnect = (
    connectionId: string,
    organisationId: string,
    mode: "destructive" | "soft"
  ) => {
    startTransition(async () => {
      const result = await disconnectXeroAction({
        confirmationText,
        connectionId,
        mode,
        organisationId,
      });
      toast[result.ok ? "success" : "error"](
        result.ok ? "Xero disconnected." : result.error.message
      );
    });
  };

  const runReconciliation = (organisationId: string, xeroTenantId: string) => {
    startTransition(async () => {
      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "approval_state_reconciliation",
        xeroTenantId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const message = result.value.queued
        ? "Reconciliation dispatched."
        : (result.value.reason ?? "Reconciliation not queued.");
      toast.success(message);
    });
  };

  let connectionStatus: "connected" | "disconnected" | "revoked";
  if (connection?.revoked_at) {
    connectionStatus = "revoked";
  } else if (connection) {
    connectionStatus = "connected";
  } else {
    connectionStatus = "disconnected";
  }

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Manage the Xero connection and per-tenant sync state."
        title="Xero Payroll"
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Connection</CardTitle>
              <CardDescription>
                Refresh, disconnect, or reconnect the organisation Xero link.
              </CardDescription>
            </div>
            <ProviderStatusBadge status={connectionStatus} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!connection && (
            <Button
              disabled={isPending}
              onClick={() => handleConnect(organisationId)}
            >
              Connect Xero
            </Button>
          )}
          {connection && (
            <>
              <div className="min-w-[260px] space-y-2">
                <Label htmlFor="disconnect-confirmation">
                  Type the organisation name to confirm disconnect
                </Label>
                <Input
                  id="disconnect-confirmation"
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder={organisationName}
                  value={confirmationText}
                />
              </div>
              <Button
                disabled={isPending}
                onClick={() =>
                  handleRefresh(connection.id, connection.organisation_id)
                }
                variant="outline"
              >
                Refresh connection
              </Button>
              <Button
                disabled={isPending}
                onClick={() =>
                  handleDisconnect(
                    connection.id,
                    connection.organisation_id,
                    "soft"
                  )
                }
                variant="outline"
              >
                Soft disconnect
              </Button>
              <Button
                disabled={isPending}
                onClick={() =>
                  handleDisconnect(
                    connection.id,
                    connection.organisation_id,
                    "destructive"
                  )
                }
                variant="destructive"
              >
                Disconnect and archive Xero data
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {summaries.map((summary) => (
        <Card className="rounded-2xl" key={summary.xeroTenantId}>
          <CardHeader>
            <CardTitle>{summary.tenantName}</CardTitle>
            <CardDescription>{summary.payrollRegion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.syncPausedAt && (
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                Sync paused since {summary.syncPausedAt.toLocaleString("en-AU")}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={Boolean(summary.syncPausedAt) || isPending}
                onClick={() =>
                  runReconciliation(organisationId, summary.xeroTenantId)
                }
              >
                Run reconciliation now
              </Button>
              {summary.syncPausedAt ? (
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await resumeTenantSyncAction({
                        organisationId,
                        xeroTenantId: summary.xeroTenantId,
                      });
                      toast[result.ok ? "success" : "error"](
                        result.ok ? "Sync resumed." : result.error.message
                      );
                    })
                  }
                  variant="outline"
                >
                  Resume sync
                </Button>
              ) : (
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await pauseTenantSyncAction({
                        organisationId,
                        xeroTenantId: summary.xeroTenantId,
                      });
                      toast[result.ok ? "success" : "error"](
                        result.ok ? "Sync paused." : result.error.message
                      );
                    })
                  }
                  variant="outline"
                >
                  Pause sync
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Recent sync runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRuns.map((run) => (
            <div className="rounded-xl bg-muted/30 p-3 text-sm" key={run.id}>
              {run.runType} · {run.status} ·{" "}
              {run.startedAt.toLocaleString("en-AU")}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
