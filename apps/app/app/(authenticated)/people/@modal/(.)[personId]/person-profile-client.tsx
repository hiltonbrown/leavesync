"use client";

import { Avatar, AvatarFallback } from "@repo/design-system/components/ui/avatar";
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

const PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    initials: "PS",
    jobTitle: "Senior Engineer",
    team: "Engineering",
    dept: "Engineering",
    location: "London, UK",
    personType: "employee",
    privacyMode: "named",
    contactable: true,
    nextReturn: null,
    avatarIdx: 0,
  },
  {
    id: "p2",
    name: "Marcus Webb",
    initials: "MW",
    jobTitle: "Backend Engineer",
    team: "Engineering",
    dept: "Engineering",
    location: "Manchester, UK",
    personType: "employee",
    privacyMode: "named",
    contactable: false,
    nextReturn: "2026-04-07",
    avatarIdx: 1,
  },
  {
    id: "p3",
    name: "Yuki Tanaka",
    initials: "YT",
    jobTitle: "Product Manager",
    team: "Product",
    dept: "Product",
    location: "London, UK",
    personType: "employee",
    privacyMode: "masked",
    contactable: true,
    nextReturn: "2026-04-17",
    avatarIdx: 2,
  },
  {
    id: "p4",
    name: "Aisha Okonkwo",
    initials: "AO",
    jobTitle: "UI Designer",
    team: "Design",
    dept: "Design",
    location: "London, UK",
    personType: "contractor",
    privacyMode: "named",
    contactable: true,
    nextReturn: null,
    avatarIdx: 3,
  },
  {
    id: "p5",
    name: "Tom Eriksson",
    initials: "TE",
    jobTitle: "Frontend Engineer",
    team: "Engineering",
    dept: "Engineering",
    location: "Stockholm, Sweden",
    personType: "employee",
    privacyMode: "named",
    contactable: true,
    nextReturn: null,
    avatarIdx: 4,
  },
  {
    id: "p6",
    name: "Sofia Reyes",
    initials: "SR",
    jobTitle: "Data Analyst",
    team: "Product",
    dept: "Product",
    location: "Madrid, Spain",
    personType: "employee",
    privacyMode: "named",
    contactable: true,
    nextReturn: null,
    avatarIdx: 5,
  },
  {
    id: "p7",
    name: "Elena Rossi",
    initials: "ER",
    jobTitle: "Product Marketing",
    team: "Product",
    dept: "Product",
    location: "Milan, Italy",
    personType: "employee",
    privacyMode: "named",
    contactable: true,
    nextReturn: null,
    avatarIdx: 0,
  },
];

const LEAVE_BALANCES: Record<string, LeaveBalance[]> = {
  p1: [
    { label: "Annual Leave", remaining: 14, unit: "days" },
    { label: "Sick Leave", remaining: 5, unit: "days" },
    { label: "Personal Leave", remaining: 3, unit: "days" },
  ],
  p2: [
    { label: "Annual Leave", remaining: 0, unit: "days" },
    { label: "Sick Leave", remaining: 3, unit: "days" },
    { label: "Personal Leave", remaining: 1, unit: "days" },
  ],
  p3: [
    { label: "Annual Leave", remaining: 22, unit: "days" },
    { label: "Sick Leave", remaining: 5, unit: "days" },
    { label: "Personal Leave", remaining: 4, unit: "days" },
  ],
  p4: [
    { label: "Annual Leave", remaining: 10, unit: "days" },
    { label: "Sick Leave", remaining: 5, unit: "days" },
  ],
  p5: [
    { label: "Annual Leave", remaining: 18, unit: "days" },
    { label: "Sick Leave", remaining: 5, unit: "days" },
    { label: "Personal Leave", remaining: 2, unit: "days" },
  ],
  p6: [
    { label: "Annual Leave", remaining: 20, unit: "days" },
    { label: "Sick Leave", remaining: 4, unit: "days" },
    { label: "Personal Leave", remaining: 5, unit: "days" },
  ],
  p7: [
    { label: "Annual Leave", remaining: 16, unit: "days" },
    { label: "Sick Leave", remaining: 5, unit: "days" },
    { label: "Personal Leave", remaining: 3, unit: "days" },
  ],
};

const ALTERNATIVE_CONTACTS: Record<string, AlternativeContact[]> = {
  p1: [
    { name: "Rajesh Sharma", relationship: "Manager", email: "rajesh@company.com" },
  ],
  p2: [
    { name: "Sarah Wilson", relationship: "Manager", email: "sarah@company.com" },
    { name: "Emma Brown", relationship: "Team lead", email: "emma@company.com" },
  ],
  p3: [{ name: "David Lee", relationship: "Manager", email: "david@company.com" }],
  p4: [
    { name: "James Chen", relationship: "Account manager", email: "james@company.com" },
  ],
  p5: [
    { name: "Anna Kowalski", relationship: "Manager", email: "anna@company.com" },
  ],
  p6: [{ name: "Carlos Rodriguez", relationship: "Manager", email: "carlos@company.com" }],
  p7: [
    { name: "Marco Bellini", relationship: "Manager", email: "marco@company.com" },
  ],
};

const UPCOMING_RECORDS: Record<string, UpcomingRecord[]> = {
  p1: [
    { id: "r1", type: "Holiday Leave", label: "Easter break", dateRange: "Apr 20–24, 2026", status: "approved" },
    { id: "r2", type: "Training", label: "React workshop", dateRange: "May 4–6, 2026", status: "draft" },
  ],
  p2: [
    { id: "r3", type: "Sick Leave", label: "Returning Apr 7", dateRange: "Apr 1–6, 2026", status: "approved" },
  ],
  p3: [
    { id: "r4", type: "Travelling", label: "Berlin conference", dateRange: "Apr 15–19, 2026", status: "approved" },
    { id: "r5", type: "Holiday Leave", label: "Summer holiday", dateRange: "Aug 1–15, 2026", status: "draft" },
    { id: "r6", type: "Personal Leave", label: "Medical appointment", dateRange: "May 3, 2026", status: "approved" },
  ],
  p4: [
    { id: "r7", type: "Holiday Leave", label: "Easter break", dateRange: "Apr 20–24, 2026", status: "approved" },
  ],
  p5: [
    { id: "r8", type: "WFH", label: "Team retrospective", dateRange: "Apr 13, 2026", status: "approved" },
  ],
  p6: [
    { id: "r9", type: "Holiday Leave", label: "Summer break", dateRange: "Jul 15–29, 2026", status: "draft" },
  ],
  p7: [
    { id: "r10", type: "Travelling", label: "Client visit", dateRange: "May 10–12, 2026", status: "approved" },
    { id: "r11", type: "Holiday Leave", label: "Easter break", dateRange: "Apr 20–24, 2026", status: "approved" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-cyan-500",
];

const getAvatarColor = (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

interface PersonProfileClientProperties {
  readonly personId: string;
}

const PersonProfileClient = ({ personId }: PersonProfileClientProperties) => {
  const person = PEOPLE.find((p) => p.id === personId) ?? PEOPLE[0];
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
            <AvatarFallback className="text-white font-semibold">
              {person.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{person.team}</Badge>
              <Badge variant="outline">{person.personType}</Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
                  return (
                    <TableRow key={balance.label}>
                      <TableCell className="font-medium">{balance.label}</TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          isZero
                            ? "text-destructive"
                            : isLow
                              ? "text-amber-600"
                              : ""
                        }`}
                      >
                        {balance.remaining} {balance.unit}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">Last updated: Mar 15, 2026</div>
        </div>

        {/* Alternative Contacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Alternative contacts</h3>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.email} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
                      <TableCell className="font-medium">{record.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {record.dateRange}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "approved"
                              ? "default"
                              : record.status === "draft"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
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
