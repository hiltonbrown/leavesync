import { getAvailabilityRecordLabel } from "@repo/core";
import { csvEscape } from "../settings/shared";
import type { AnalyticsRecordListItem } from "./leave-reports-service";

function formatApprovedBy(
  firstName: string | null,
  lastName: string | null
): string {
  if (!(firstName || lastName)) {
    return "";
  }
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function exportAnalyticsToCsv(
  records: AnalyticsRecordListItem[]
): string {
  const headers = [
    "First Name",
    "Last Name",
    "Team",
    "Location",
    "Record Type",
    "Source",
    "Starts At",
    "Ends At",
    "Working Days",
    "Submitted At",
    "Approved At",
    "Approved By",
  ];

  const rows = records.map((record) => [
    record.personFirstName,
    record.personLastName,
    record.teamName ?? "",
    record.locationName ?? "",
    getAvailabilityRecordLabel(record.recordType),
    record.sourceType,
    record.startsAt.toISOString(),
    record.endsAt.toISOString(),
    record.workingDays.toString(),
    record.submittedAt ? record.submittedAt.toISOString() : "",
    record.approvedAt ? record.approvedAt.toISOString() : "",
    formatApprovedBy(record.approvedByFirstName, record.approvedByLastName),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => csvEscape(field)).join(","))
    .join("\r\n");

  return csvContent.concat("\r\n");
}
