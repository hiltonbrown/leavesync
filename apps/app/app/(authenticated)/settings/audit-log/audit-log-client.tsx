"use client";

import type { AuditEventDetail, AuditEventListItem } from "@repo/availability";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { toast } from "@repo/design-system/components/ui/sonner";
import { useState, useTransition } from "react";
import { SettingsSectionHeader } from "../components/settings-section-header";
import { exportAuditLogCsvAction } from "./_actions";

interface AuditLogClientProps {
  details: Record<string, AuditEventDetail>;
  events: AuditEventListItem[];
  filters: {
    actionPrefix: string;
    dateFrom: string;
    dateTo: string;
    searchEntityId: string;
  };
  nextCursor: null | string;
  organisationId: string;
}

export const AuditLogClient = ({
  details,
  events,
  filters,
  organisationId,
}: AuditLogClientProps) => {
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  const exportCsv = () => {
    setExporting(true);
    startTransition(async () => {
      const result = await exportAuditLogCsvAction({
        filters: {
          actionPrefix: filters.actionPrefix || undefined,
          dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
          searchEntityId: filters.searchEntityId || undefined,
        },
        organisationId,
      });

      setExporting(false);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      const blob = new Blob([result.value.csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.value.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log export ready.");
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        action={
          <Button disabled={exporting || isPending} onClick={exportCsv}>
            Export CSV
          </Button>
        }
        description="All system and user actions for this organisation."
        title="Audit Log"
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 p-4 md:grid-cols-4">
          <Input defaultValue={filters.dateFrom} name="dateFrom" type="date" />
          <Input defaultValue={filters.dateTo} name="dateTo" type="date" />
          <Input
            defaultValue={filters.actionPrefix}
            name="actionPrefix"
            placeholder="Action prefix"
          />
          <Input
            defaultValue={filters.searchEntityId}
            name="entityId"
            placeholder="Entity ID"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{events.length} events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.map((event) => (
            <details className="rounded-xl bg-muted/30 p-4" key={event.id}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{event.action}</p>
                    <p className="text-muted-foreground text-xs">
                      {event.entityType} · {event.entityId} ·{" "}
                      {event.actorDisplay}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {event.createdAt.toLocaleString("en-AU")}
                  </div>
                </div>
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
                {details[event.id] && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
                      {JSON.stringify(details[event.id].beforeValue, null, 2)}
                    </pre>
                    <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
                      {JSON.stringify(details[event.id].afterValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
