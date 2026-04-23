"use client";

import type {
  Organisation,
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
  refreshXeroConnectionAction,
} from "./_actions";

type OrganisationWithXero = Organisation & {
  xero_connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
};

interface XeroClientProps {
  organisations: OrganisationWithXero[];
}

export const XeroClient = ({ organisations }: XeroClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [confirmationTextByOrganisation, setConfirmationTextByOrganisation] =
    useState<Record<string, string>>({});

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
    organisationName: string,
    mode: "destructive" | "soft"
  ) => {
    startTransition(async () => {
      const result = await disconnectXeroAction({
        confirmationText: confirmationTextByOrganisation[organisationId] ?? "",
        connectionId,
        mode,
        organisationId,
      });
      const successMessage =
        mode === "destructive"
          ? "Xero disconnected and Xero-linked data purged."
          : "Xero disconnected. Historical data is now read-only.";
      toast[result.ok ? "success" : "error"](
        result.ok ? successMessage : result.error.message
      );

      if (result.ok) {
        setConfirmationTextByOrganisation((current) => ({
          ...current,
          [organisationId]: organisationName,
        }));
      }
    });
  };

  const runSync = (
    organisationId: string,
    xeroTenantId: string,
    runType: string
  ) => {
    startTransition(async () => {
      const result = await dispatchManualSyncAction({
        organisationId,
        runType,
        xeroTenantId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (!result.value.queued) {
        toast.error(
          result.value.reason === "connection_not_active"
            ? "Reconnect Xero before running syncs."
            : "This sync is not available yet."
        );
        return;
      }
      toast.success("Sync dispatched.");
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Each payroll organisation owns one Xero connection and one Xero tenant. Status is shared across everyone in this Clerk Organisation."
        title="Xero Payroll"
      />

      {organisations.map((organisation) => {
        const connection = organisation.xero_connection;
        const tenant = connection?.xero_tenant ?? null;
        const status = statusForConnection(connection);
        const confirmationText =
          confirmationTextByOrganisation[organisation.id] ?? "";

        return (
          <Card className="rounded-2xl" key={organisation.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{organisation.name}</CardTitle>
                  <CardDescription>
                    {tenant
                      ? `${tenant.tenant_name ?? tenant.xero_tenant_id} · ${tenant.payroll_region}`
                      : `${organisation.country_code} payroll organisation`}
                  </CardDescription>
                </div>
                <ProviderStatusBadge status={status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {connection?.last_error_message ? (
                <div className="rounded-2xl bg-destructive/10 p-3 text-destructive text-sm">
                  {connection.last_error_message}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-4">
                <Stat
                  label="People sync"
                  value={formatTimestamp(tenant?.last_people_sync_at ?? null)}
                />
                <Stat
                  label="Leave sync"
                  value={formatTimestamp(
                    tenant?.last_leave_records_sync_at ?? null
                  )}
                />
                <Stat
                  label="Balance sync"
                  value={formatTimestamp(
                    tenant?.last_leave_balances_sync_at ?? null
                  )}
                />
                <Stat
                  label="Reconciliation"
                  value={formatTimestamp(
                    tenant?.last_approval_state_reconciled_at ?? null
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={isPending}
                  onClick={() => handleConnect(organisation.id)}
                >
                  {connection ? "Reconnect Xero" : "Connect Xero"}
                </Button>
                {connection ? (
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      handleRefresh(connection.id, organisation.id)
                    }
                    variant="outline"
                  >
                    Refresh tokens
                  </Button>
                ) : null}
                {tenant ? (
                  <>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runSync(organisation.id, tenant.id, "people")
                      }
                      variant="outline"
                    >
                      Sync people
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runSync(organisation.id, tenant.id, "leave_records")
                      }
                      variant="outline"
                    >
                      Sync leave records
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runSync(organisation.id, tenant.id, "leave_balances")
                      }
                      variant="outline"
                    >
                      Sync balances
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runSync(
                          organisation.id,
                          tenant.id,
                          "approval_state_reconciliation"
                        )
                      }
                      variant="outline"
                    >
                      Reconcile approval state
                    </Button>
                  </>
                ) : null}
              </div>

              {connection ? (
                <div className="space-y-3 rounded-2xl bg-muted/30 p-4">
                  <div className="space-y-2">
                    <Label htmlFor={`disconnect-${organisation.id}`}>
                      Type the organisation name to confirm disconnect
                    </Label>
                    <Input
                      id={`disconnect-${organisation.id}`}
                      onChange={(event) =>
                        setConfirmationTextByOrganisation((current) => ({
                          ...current,
                          [organisation.id]: event.target.value,
                        }))
                      }
                      placeholder={organisation.name}
                      value={confirmationText}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        handleDisconnect(
                          connection.id,
                          organisation.id,
                          organisation.name,
                          "soft"
                        )
                      }
                      variant="outline"
                    >
                      Standard disconnect
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        handleDisconnect(
                          connection.id,
                          organisation.id,
                          organisation.name,
                          "destructive"
                        )
                      }
                      variant="destructive"
                    >
                      Destructive disconnect
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

function statusForConnection(
  connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null
): "connected" | "disconnected" | "error" | "expired" | "revoked" {
  if (!connection) {
    return "disconnected";
  }
  if (connection.revoked_at) {
    return "revoked";
  }
  if (connection.status === "stale") {
    return "expired";
  }
  if (
    connection.status === "pending" ||
    connection.status === "pending_tenant_selection"
  ) {
    return "error";
  }
  if (connection.status === "disconnected" || connection.disconnected_at) {
    return "disconnected";
  }
  if (connection.expires_at.getTime() <= Date.now()) {
    return "expired";
  }
  return "connected";
}

function formatTimestamp(value: Date | null): string {
  return value ? value.toLocaleString("en-AU") : "Not run yet";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
