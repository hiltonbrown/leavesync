"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  CalendarRangeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { archiveManualAvailabilityAction } from "@/app/actions/availability/manual";
import {
  ManualAvailabilityForm,
  type ManualAvailabilityFormPerson,
  type ManualAvailabilityFormRecord,
} from "../availability/manual-availability-form";

interface ManualRecord {
  allDay: boolean;
  approvalStatus: string;
  archivedAt: Date | null;
  contactability: string;
  createdAt: Date;
  endsAt: Date;
  id: string;
  includeInFeed: boolean;
  notesInternal: string | null;
  personFirstName: string;
  personId: string;
  personLastName: string;
  privacyMode: string;
  recordType: string;
  startsAt: Date;
  title: string | null;
  workingLocation: string | null;
}

interface PlansClientProps {
  initialRecords: ManualRecord[];
  organisationId: string;
  orgQueryValue: null | string;
  people: ManualAvailabilityFormPerson[];
}

const typeLabels: Record<string, string> = {
  client_site: "Client site",
  leave: "Leave",
  training: "Training",
  travel: "Travel",
  wfh: "Working from home",
};

export function PlansClient({
  initialRecords,
  organisationId,
  orgQueryValue,
  people,
}: PlansClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ManualRecord | null>(null);

  const upcomingRecords = useMemo(
    () =>
      [...initialRecords].sort(
        (first, second) => first.startsAt.getTime() - second.startsAt.getTime()
      ),
    [initialRecords]
  );

  const handleArchive = (recordId: string) => {
    startTransition(async () => {
      const result = await archiveManualAvailabilityAction({
        organisationId,
        recordId,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Availability record archived");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
            Manual availability
          </p>
          <h1 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
            My Plans
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            {upcomingRecords.length} active record
            {upcomingRecords.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          New plan
        </Button>
      </div>

      {upcomingRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-muted py-20 text-center">
          <CalendarRangeIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.5}
          />
          <div>
            <p className="font-semibold text-foreground text-title-md">
              No plans yet
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Add leave, remote work, training, or client-site time.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add your first plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {upcomingRecords.map((record) => (
            <article className="rounded-2xl bg-muted p-5" key={record.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {record.title || typeLabels[record.recordType] || "Plan"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {record.personFirstName} {record.personLastName} ·{" "}
                    {typeLabels[record.recordType] ?? record.recordType} ·{" "}
                    {formatDate(record.startsAt)} to {formatDate(record.endsAt)}
                  </p>
                  {record.workingLocation && (
                    <p className="mt-1 text-muted-foreground text-sm">
                      {record.workingLocation}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    onClick={() => setEditingRecord(record)}
                    size="sm"
                    variant="secondary"
                  >
                    <PencilIcon className="mr-2 size-4" />
                    Edit
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => handleArchive(record.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2Icon className="mr-2 size-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
            <DialogDescription>
              Create a manual availability record for calendar and feed
              publishing.
            </DialogDescription>
          </DialogHeader>
          <ManualAvailabilityForm
            mode="create"
            onSaved={() => setCreateOpen(false)}
            organisationId={organisationId}
            orgQueryValue={orgQueryValue}
            people={people}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setEditingRecord(null)}
        open={Boolean(editingRecord)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
            <DialogDescription>
              Update the manual availability record used by calendars and feeds.
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <ManualAvailabilityForm
              mode="edit"
              onSaved={() => setEditingRecord(null)}
              organisationId={organisationId}
              orgQueryValue={orgQueryValue}
              people={people}
              record={toFormRecord(editingRecord)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toFormRecord(record: ManualRecord): ManualAvailabilityFormRecord {
  return {
    allDay: record.allDay,
    contactability: normaliseContactability(record.contactability),
    endsAt: toDateInputValue(record.endsAt),
    id: record.id,
    includeInFeed: record.includeInFeed,
    notesInternal: record.notesInternal ?? "",
    personId: record.personId,
    privacyMode: normalisePrivacyMode(record.privacyMode),
    recordType: normaliseRecordType(record.recordType),
    startsAt: toDateInputValue(record.startsAt),
    title: record.title ?? "",
    workingLocation: record.workingLocation ?? "",
  };
}

function normaliseContactability(
  value: string
): ManualAvailabilityFormRecord["contactability"] {
  if (
    value === "contactable" ||
    value === "limited" ||
    value === "unavailable"
  ) {
    return value;
  }

  return "contactable";
}

function normalisePrivacyMode(
  value: string
): ManualAvailabilityFormRecord["privacyMode"] {
  if (value === "masked" || value === "named" || value === "private") {
    return value;
  }

  return "named";
}

function normaliseRecordType(
  value: string
): ManualAvailabilityFormRecord["recordType"] {
  if (
    value === "client_site" ||
    value === "leave" ||
    value === "training" ||
    value === "travel" ||
    value === "wfh"
  ) {
    return value;
  }

  return "wfh";
}
