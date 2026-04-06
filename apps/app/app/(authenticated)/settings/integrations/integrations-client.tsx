"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { LinkIcon, RefreshCwIcon, UnlinkIcon } from "lucide-react";
import { toast } from "@repo/design-system/components/ui/sonner";
import { ProviderStatusBadge } from "../components/provider-status-badge";
import { SettingsSectionHeader } from "../components/settings-section-header";

type ConnectionStatus = "connected" | "disconnected" | "error";

interface ProviderCapabilities {
  absenceTypes: boolean;
  approvedAbsences: boolean;
  balances: boolean;
  employees: boolean;
  incrementalSync: boolean;
  locations: boolean;
  teams: boolean;
  webhooks: boolean;
}

interface ProviderConnectionView {
  capabilities: ProviderCapabilities | null;
  id: string | null;
  lastSyncedAt: Date | null;
  provider: "xero" | "myob" | "zoho" | "quickbooks";
  status: ConnectionStatus;
}

interface IntegrationsClientProps {
  connections: ProviderConnectionView[];
}

const PROVIDER_META: Record<
  ProviderConnectionView["provider"],
  { name: string; description: string; color: string; initials: string }
> = {
  xero: {
    name: "Xero Payroll AU",
    description:
      "Sync approved leave from Xero Payroll for Australian organisations.",
    color: "#13B5EA",
    initials: "X",
  },
  myob: {
    name: "MYOB",
    description:
      "Connect MYOB AccountRight or Essentials to sync employee leave.",
    color: "#6D2077",
    initials: "M",
  },
  zoho: {
    name: "Zoho People",
    description: "Import leave records from Zoho People HR platform.",
    color: "#E42527",
    initials: "Z",
  },
  quickbooks: {
    name: "QuickBooks",
    description: "Sync time-off data from QuickBooks Payroll.",
    color: "#2CA01C",
    initials: "QB",
  },
};

const CAPABILITY_LABELS: Record<keyof ProviderCapabilities, string> = {
  employees: "Employees",
  absenceTypes: "Absence types",
  approvedAbsences: "Approved absences",
  balances: "Leave balances",
  teams: "Teams",
  locations: "Locations",
  webhooks: "Webhooks",
  incrementalSync: "Incremental sync",
};

// Build the default view showing all providers as disconnected
const DEFAULT_CONNECTIONS: ProviderConnectionView[] = (
  ["xero", "myob", "zoho", "quickbooks"] as const
).map((provider) => ({
  id: null,
  provider,
  status: "disconnected",
  lastSyncedAt: null,
  capabilities: null,
}));

export const IntegrationsClient = ({
  connections,
}: IntegrationsClientProps) => {
  // Merge live connections into the full provider list
  const connectedMap = new Map(connections.map((c) => [c.provider, c]));
  const allProviders = DEFAULT_CONNECTIONS.map(
    (def) => connectedMap.get(def.provider) ?? def
  );

  const handleConnect = (provider: ProviderConnectionView["provider"]) => {
    toast.info(`${PROVIDER_META[provider].name} integration coming soon`);
  };

  const handleDisconnect = () => {
    toast.info("Disconnect not yet available");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Connect your payroll and HR systems to sync leave data into LeaveSync."
        title="Integrations"
      />

      <div className="grid gap-4">
        {allProviders.map((conn) => {
          const meta = PROVIDER_META[conn.provider];

          return (
            <Card className="rounded-2xl bg-muted/40" key={conn.provider}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Provider logo placeholder */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.initials}
                    </div>
                    <div>
                      <CardTitle className="text-base">{meta.name}</CardTitle>
                      <CardDescription className="mt-0.5 text-sm">
                        {meta.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ProviderStatusBadge status={conn.status} />
                    {conn.status === "connected" && (
                      <Button
                        className="gap-1.5 text-xs"
                        onClick={() => handleDisconnect()}
                        size="sm"
                        variant="outline"
                      >
                        <UnlinkIcon className="h-3 w-3" strokeWidth={2} />
                        Disconnect
                      </Button>
                    )}
                    {conn.status === "error" && (
                      <Button
                        className="gap-1.5 text-xs"
                        onClick={() => handleConnect(conn.provider)}
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCwIcon className="h-3 w-3" strokeWidth={2} />
                        Reconnect
                      </Button>
                    )}
                    {conn.status === "disconnected" && (
                      <Button
                        className="gap-1.5 text-xs"
                        onClick={() => handleConnect(conn.provider)}
                        size="sm"
                      >
                        <LinkIcon className="h-3 w-3" strokeWidth={2} />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {conn.status === "connected" && conn.capabilities && (
                <CardContent className="pt-0">
                  <div className="border-border/40 border-t pt-3">
                    <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        Object.entries(conn.capabilities) as [
                          keyof ProviderCapabilities,
                          boolean,
                        ][]
                      )
                        .filter(([, enabled]) => enabled)
                        .map(([key]) => (
                          <span
                            className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs"
                            key={key}
                          >
                            {CAPABILITY_LABELS[key]}
                          </span>
                        ))}
                    </div>
                    {conn.lastSyncedAt && (
                      <p className="mt-3 text-muted-foreground text-xs">
                        Last synced {conn.lastSyncedAt.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
