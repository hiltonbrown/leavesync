"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { ScrollTextIcon } from "lucide-react";
import { SettingsSectionHeader } from "../components/settings-section-header";

interface AuditEntry {
  action: string;
  actorEmail: string;
  actorName: string;
  id: string;
  ipAddress: string | null;
  resourceType: string;
  status: "success" | "failure";
  timestamp: string;
}

interface AuditLogClientProps {
  entries: AuditEntry[];
}

const EVENT_TYPES = [
  { value: "all", label: "All events" },
  { value: "member.invited", label: "Member invited" },
  { value: "member.removed", label: "Member removed" },
  { value: "member.role_changed", label: "Role changed" },
  { value: "connection.created", label: "Connection created" },
  { value: "connection.removed", label: "Connection removed" },
  { value: "feed.created", label: "Feed created" },
  { value: "feed.deleted", label: "Feed deleted" },
  { value: "sync.triggered", label: "Sync triggered" },
  { value: "token.revoked", label: "Tokens revoked" },
];

export const AuditLogClient = ({ entries }: AuditLogClientProps) => {
  const isEmpty = entries.length === 0;

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="A record of administrative actions taken within your organisation."
        title="Audit Log"
      />

      {/* Filter row */}
      <Card className="rounded-2xl bg-muted/40">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">From</Label>
            <Input
              className="h-8 w-36 text-sm"
              disabled={isEmpty}
              type="date"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">To</Label>
            <Input
              className="h-8 w-36 text-sm"
              disabled={isEmpty}
              type="date"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Event type</Label>
            <Select defaultValue="all" disabled={isEmpty}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((e) => (
                  <SelectItem className="text-sm" key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isEmpty && (
            <Button className="h-8 text-sm" size="sm">
              Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="rounded-2xl bg-muted/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {isEmpty ? "Events" : `${entries.length} events`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isEmpty ? (
            <div className="px-6 pb-6">
              <Empty className="border-0 bg-transparent py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScrollTextIcon strokeWidth={1.75} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">
                    No audit events yet
                  </EmptyTitle>
                  <EmptyDescription>
                    Admin actions — invites, role changes, connection events —
                    will be recorded here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 border-b hover:bg-transparent">
                  <TableHead className="pl-6">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    className="border-border/40 border-b last:border-0"
                    key={entry.id}
                  >
                    <TableCell className="pl-6 font-mono text-muted-foreground text-xs">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{entry.actorName}</p>
                      <p className="text-muted-foreground text-xs">
                        {entry.actorEmail}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{entry.action}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {entry.resourceType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {entry.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          entry.status === "success"
                            ? "border-primary/20 bg-primary/10 text-primary text-xs"
                            : "border-destructive/20 bg-destructive/10 text-destructive text-xs"
                        }
                        variant="outline"
                      >
                        {entry.status === "success" ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
