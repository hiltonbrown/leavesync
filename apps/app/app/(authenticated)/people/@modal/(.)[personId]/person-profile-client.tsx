"use client";

import {
  Avatar,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { MailIcon, MapPinIcon, PlusIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaveBalance {
  label: string;
  remaining: number;
  unit: "days" | "hours";
}

interface AlternativeContact {
  email: string;
  name: string;
  relationship: string;
}

interface UpcomingRecord {
  dateRange: string;
  id: string;
  label: string;
  status: "draft" | "approved" | "declined";
  type: string;
}

interface Person {
  avatarIdx: number;
  contactable: boolean;
  dept: string;
  id: string;
  initials: string;
  jobTitle: string;
  location: string;
  name: string;
  nextReturn: string | null;
  personType: "employee" | "contractor";
  privacyMode: "named" | "masked";
  team: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PEOPLE: Person[] = [];

const LEAVE_BALANCES: Record<string, LeaveBalance[]> = {};

const ALTERNATIVE_CONTACTS: Record<string, AlternativeContact[]> = {};

const UPCOMING_RECORDS: Record<string, UpcomingRecord[]> = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-cyan-500",
];

const getAvatarColor = (idx: number) =>
  AVATAR_COLORS[idx % AVATAR_COLORS.length];

interface PersonProfileClientProperties {
  readonly personId: string;
}

const PersonProfileClient = ({ personId }: PersonProfileClientProperties) => {
  const person = PEOPLE.find((p) => p.id === personId) ?? PEOPLE[0];

  if (!person) {
    return (
      <DialogHeader className="mb-6">
        <DialogTitle>Person not found</DialogTitle>
      </DialogHeader>
    );
  }

  const balances = LEAVE_BALANCES[person.id] || [];
  const contacts = ALTERNATIVE_CONTACTS[person.id] || [];
  const upcomingRecords = UPCOMING_RECORDS[person.id] || [];

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle>{person.name}</DialogTitle>
        <DialogDescription>{person.jobTitle}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Person Header */}
        <div className="flex items-start gap-4">
          <Avatar className={`h-12 w-12 ${getAvatarColor(person.avatarIdx)}`}>
            <AvatarFallback className="font-semibold text-white">
              {person.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{person.team}</Badge>
              <Badge variant="outline">{person.personType}</Badge>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPinIcon className="h-4 w-4" />
              {person.location}
            </div>
          </div>
        </div>

        {/* Leave Balances */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Leave balances</h3>
          <div className="rounded-lg border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Leave type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => {
                  const isZero = balance.remaining === 0;
                  const isLow = balance.remaining < 3;
                  const balanceClassName = getBalanceClassName(isZero, isLow);
                  return (
                    <TableRow key={balance.label}>
                      <TableCell className="font-medium">
                        {balance.label}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${balanceClassName}`}
                      >
                        {balance.remaining} {balance.unit}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-muted-foreground text-xs">
            Last updated: Mar 15, 2026
          </div>
        </div>

        {/* Alternative Contacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Alternative contacts</h3>
            <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                className="rounded-lg border p-3 text-sm"
                key={contact.email}
              >
                <div className="font-medium">{contact.name}</div>
                <div className="text-muted-foreground text-xs">
                  {contact.relationship}
                </div>
                <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                  <MailIcon className="h-3 w-3" />
                  {contact.email}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Records */}
        {upcomingRecords.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Upcoming records</h3>
            <div className="rounded-lg border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date range</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.type}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {record.dateRange}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          variant={getRecordStatusVariant(record.status)}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export { PersonProfileClient };

function getBalanceClassName(isZero: boolean, isLow: boolean): string {
  if (isZero) {
    return "text-destructive";
  }
  if (isLow) {
    return "text-amber-600";
  }
  return "";
}

function getRecordStatusVariant(
  status: string
): "default" | "destructive" | "secondary" {
  if (status === "approved") {
    return "default";
  }
  if (status === "draft") {
    return "secondary";
  }
  return "destructive";
}
