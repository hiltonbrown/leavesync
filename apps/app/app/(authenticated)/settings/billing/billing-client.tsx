"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  DownloadIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { SettingsSectionHeader } from "../components/settings-section-header";

interface UsageMeter {
  label: string;
  limit: number | null;
  used: number;
}

interface Invoice {
  amount: string;
  date: string;
  id: string;
  status: "paid" | "open" | "void";
  url: string | null;
}

interface BillingClientProps {
  invoices: Invoice[];
  planName: string;
  planPrice: string | null;
  renewalDate: string | null;
  usage: UsageMeter[];
}

const PLAN_FEATURES: Record<string, string[]> = {
  Free: [
    "1 provider connection",
    "Up to 5 employees",
    "2 calendar feeds",
    "ICS + HTML publishing",
  ],
  Starter: [
    "3 provider connections",
    "Up to 50 employees",
    "10 calendar feeds",
    "Slack notifications",
    "Priority support",
  ],
  Pro: [
    "Unlimited connections",
    "Unlimited employees",
    "Unlimited feeds",
    "Slack + Teams notifications",
    "Webhook publishing",
    "Audit log",
    "SLA support",
  ],
  Enterprise: [
    "Everything in Pro",
    "Custom integrations",
    "Dedicated account manager",
    "Custom SLA",
    "SSO / SAML",
  ],
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  paid: {
    label: "Paid",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  open: {
    label: "Open",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  void: {
    label: "Void",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const BillingClient = ({
  planName,
  planPrice,
  renewalDate,
  usage,
  invoices,
}: BillingClientProps) => {
  const features = PLAN_FEATURES[planName] ?? PLAN_FEATURES.Free;
  const isFreePlan = planName === "Free";

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Manage your plan, usage, and billing history."
        title="Billing"
      />

      {/* Plan card */}
      <Card className="rounded-2xl bg-muted/40">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Current plan</CardTitle>
              <CardDescription>
                {isFreePlan
                  ? "You're on the free plan."
                  : (renewalDate ?? "Active subscription")}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-bold text-2xl tracking-tight">
                  {planName}
                </span>
                {!isFreePlan && (
                  <Badge className="text-xs" variant="default">
                    Active
                  </Badge>
                )}
              </div>
              {planPrice && (
                <p className="text-muted-foreground text-sm">{planPrice}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid grid-cols-2 gap-2">
            {features.map((f) => (
              <li className="flex items-center gap-2 text-sm" key={f}>
                <CheckCircle2Icon
                  className="h-4 w-4 shrink-0 text-primary"
                  strokeWidth={1.75}
                />
                {f}
              </li>
            ))}
          </ul>

          {isFreePlan && (
            <div className="mt-4 rounded-xl bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon
                    className="h-5 w-5 text-primary"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="font-semibold text-sm">Upgrade to Starter</p>
                    <p className="text-muted-foreground text-xs">
                      More connections, employees, and Slack notifications.
                    </p>
                  </div>
                </div>
                <Button className="shrink-0 gap-1.5" size="sm">
                  <ZapIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  Upgrade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage meters */}
      {usage.length > 0 && (
        <Card className="rounded-2xl bg-muted/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>
              Current usage against your plan limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {usage.map((meter) => {
                const pct = meter.limit
                  ? Math.min((meter.used / meter.limit) * 100, 100)
                  : 0;
                const isNearLimit = pct >= 80;

                return (
                  <div
                    className="rounded-xl bg-background/60 p-4"
                    key={meter.label}
                  >
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {meter.label}
                    </p>
                    <p className="mt-1 font-semibold text-2xl tabular-nums">
                      {meter.used}
                      {meter.limit && (
                        <span className="font-normal text-muted-foreground text-sm">
                          /{meter.limit}
                        </span>
                      )}
                    </p>
                    {meter.limit && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice history */}
      <Card className="rounded-2xl bg-muted/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Invoice history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="px-6 pb-6">
              <Empty className="border-0 bg-transparent py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CreditCardIcon strokeWidth={1.75} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">No invoices yet</EmptyTitle>
                  <EmptyDescription>
                    Invoices will appear here once you upgrade to a paid plan.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 border-b hover:bg-transparent">
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const statusConfig =
                    STATUS_BADGE[inv.status] ?? STATUS_BADGE.void;
                  return (
                    <TableRow
                      className="border-border/40 border-b last:border-0"
                      key={inv.id}
                    >
                      <TableCell className="pl-6 text-sm">{inv.date}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {inv.amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${statusConfig.className}`}
                          variant="outline"
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {inv.url && (
                          <Button
                            asChild
                            className="h-7 w-7 text-muted-foreground"
                            size="icon"
                            variant="ghost"
                          >
                            <a href={inv.url} rel="noreferrer" target="_blank">
                              <DownloadIcon
                                className="h-4 w-4"
                                strokeWidth={1.75}
                              />
                              <span className="sr-only">Download invoice</span>
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
