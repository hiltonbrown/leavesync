"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import {
  retrySubmissionAction,
  revertToDraftAction,
  submitForApprovalAction,
} from "@/app/(authenticated)/plans/_actions";
import { InterceptingModalShell } from "@/components/modals/intercepting-modal-shell";
import { XeroSyncFailedState } from "@/components/states/xero-sync-failed-state";

interface SubmitConfirmationRecord {
  balanceAvailable: number | null;
  endsAt: string;
  id: string;
  organisationId: string;
  recordType: string;
  startsAt: string;
  workingDays: number | null;
}

interface SubmitConfirmationModalProps {
  inline?: boolean;
  mode: "retry" | "submit";
  onClose: () => void;
  onSuccess: () => void;
  record: SubmitConfirmationRecord;
}

const recordTypeLabels: Record<string, string> = {
  annual_leave: "Annual leave",
  holiday: "Holiday",
  long_service_leave: "Long service leave",
  personal_leave: "Personal leave",
  sick_leave: "Sick leave",
  unpaid_leave: "Unpaid leave",
};

export function SubmitConfirmationModal({
  inline = false,
  mode,
  onClose,
  onSuccess,
  record,
}: SubmitConfirmationModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const title = mode === "retry" ? "Retry submission?" : "Submit for approval?";

  const submit = async () => {
    setIsPending(true);
    try {
      setMessage(null);
      const action =
        mode === "retry" ? retrySubmissionAction : submitForApprovalAction;
      const result = await action({
        organisationId: record.organisationId,
        recordId: record.id,
      });

      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }

      if (result.value.approvalStatus === "xero_sync_failed") {
        setMessage(
          result.value.xeroWriteError ??
            "Something went wrong when sending this to Xero. Try again or contact support if the issue continues."
        );
        return;
      }

      onSuccess();
    } finally {
      setIsPending(false);
    }
  };

  const revert = async () => {
    setIsPending(true);
    try {
      const result = await revertToDraftAction({
        organisationId: record.organisationId,
        recordId: record.id,
      });
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      onClose();
    } finally {
      setIsPending(false);
    }
  };

  const content = (
    <div className="space-y-5">
      <div className="rounded-2xl bg-muted p-4 text-sm">
        <dl className="grid gap-3">
          <SummaryRow label="Leave type">
            {recordTypeLabels[record.recordType] ??
              labelForType(record.recordType)}
          </SummaryRow>
          <SummaryRow label="Dates">
            {formatDateRange(record.startsAt, record.endsAt)}
          </SummaryRow>
          <SummaryRow label="Duration">
            {record.workingDays === null
              ? "Duration unavailable"
              : `${record.workingDays} working days`}
          </SummaryRow>
          <SummaryRow label="Balance impact">
            {balanceImpact(record.balanceAvailable, record.workingDays)}
          </SummaryRow>
        </dl>
      </div>

      <p className="text-muted-foreground text-sm">
        This will send the record to Xero Payroll and notify your manager.
      </p>

      {message && (
        <XeroSyncFailedState
          message={message}
          retrySlot={
            <Button
              disabled={isPending}
              onClick={submit}
              size="sm"
              type="button"
            >
              Try again
            </Button>
          }
          revertSlot={
            <Button
              disabled={isPending}
              onClick={revert}
              size="sm"
              type="button"
              variant="secondary"
            >
              Save as draft instead
            </Button>
          }
        />
      )}

      <div className="flex justify-end gap-3">
        <Button
          disabled={isPending}
          onClick={onClose}
          type="button"
          variant="secondary"
        >
          Cancel
        </Button>
        <Button disabled={isPending} onClick={submit} type="button">
          {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          {mode === "retry" ? "Try again" : "Confirm and submit"}
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/80 p-4 backdrop-blur-sm">
        <section className="w-full max-w-[400px] rounded-2xl bg-background p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">{title}</h2>
          {content}
        </section>
      </div>
    );
  }

  return (
    <InterceptingModalShell onClose={onClose} size="narrow" title={title}>
      {content}
    </InterceptingModalShell>
  );
}

function SummaryRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1">
      <dt className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
        {label}
      </dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function balanceImpact(
  balanceAvailable: number | null,
  workingDays: number | null
) {
  if (balanceAvailable === null || workingDays === null) {
    return "Balance unavailable";
  }
  return `${balanceAvailable - workingDays} days remaining after this submission`;
}

function formatDateRange(startsAt: string, endsAt: string): string {
  const start = formatDate(startsAt);
  const end = formatDate(endsAt);
  return start === end ? start : `${start} to ${end}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function labelForType(recordType: string): string {
  return recordType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
