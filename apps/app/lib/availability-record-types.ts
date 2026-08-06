const LEAVE_RECORD_TYPES = new Set([
  "leave",
  "annual_leave",
  "personal_leave",
  "holiday",
  "sick_leave",
  "long_service_leave",
  "unpaid_leave",
  "public_holiday",
  "leave_request",
]);

const TRAVELLING_RECORD_TYPES = new Set([
  "travel",
  "travelling",
  "client_site",
  "training",
  "another_office",
  "offsite_meeting",
]);

const REMOTE_RECORD_TYPES = new Set(["wfh"]);

const LIMITED_AVAILABILITY_RECORD_TYPES = new Set([
  "contractor_unavailable",
  "limited_availability",
  "alternative_contact",
  "other",
]);

const RECORD_TYPE_LABELS: Record<string, string> = {
  alternative_contact: "Alternative Contact",
  annual_leave: "Annual Leave",
  another_office: "Another Office",
  client_site: "Client Site",
  contractor_unavailable: "Contractor Unavailable",
  holiday: "Holiday",
  leave: "Leave",
  leave_request: "Leave Request",
  limited_availability: "Limited Availability",
  long_service_leave: "Long Service Leave",
  offsite_meeting: "Offsite Meeting",
  other: "Other",
  personal_leave: "Personal Leave",
  public_holiday: "Public Holiday",
  sick_leave: "Sick Leave",
  training: "Training",
  travel: "Travel",
  travelling: "Travelling",
  unpaid_leave: "Unpaid Leave",
  wfh: "Work From Home",
};

export type PersonStatus =
  | "in-office"
  | "remote"
  | "away"
  | "sick"
  | "travelling";

export type LeaveApprovalCategory =
  | "holiday"
  | "personal"
  | "out-of-office"
  | "wfh"
  | "travelling"
  | "custom";

export function getAvailabilityRecordLabel(recordType: string): string {
  return (
    RECORD_TYPE_LABELS[recordType] ??
    recordType
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function isLeaveRecordType(recordType: string): boolean {
  return LEAVE_RECORD_TYPES.has(recordType);
}

export function isTravellingRecordType(recordType: string): boolean {
  return TRAVELLING_RECORD_TYPES.has(recordType);
}

export function isRemoteRecordType(recordType: string): boolean {
  return REMOTE_RECORD_TYPES.has(recordType);
}

export function isUnavailableRecordType(recordType: string): boolean {
  return (
    isLeaveRecordType(recordType) ||
    isTravellingRecordType(recordType) ||
    isRemoteRecordType(recordType) ||
    LIMITED_AVAILABILITY_RECORD_TYPES.has(recordType)
  );
}

export function derivePersonStatus(recordType: string): PersonStatus {
  if (recordType === "sick_leave") {
    return "sick";
  }
  if (isLeaveRecordType(recordType)) {
    return "away";
  }
  if (isRemoteRecordType(recordType)) {
    return "remote";
  }
  if (isTravellingRecordType(recordType)) {
    return "travelling";
  }
  return "in-office";
}

export function mapRecordTypeToApprovalCategory(
  recordType: string
): LeaveApprovalCategory {
  if (
    [
      "leave",
      "annual_leave",
      "holiday",
      "long_service_leave",
      "unpaid_leave",
    ].includes(recordType)
  ) {
    return "holiday";
  }
  if (["personal_leave", "sick_leave"].includes(recordType)) {
    return "personal";
  }
  if (isRemoteRecordType(recordType)) {
    return "wfh";
  }
  if (isTravellingRecordType(recordType)) {
    return "travelling";
  }
  if (
    [
      "public_holiday",
      "leave_request",
      "contractor_unavailable",
      "limited_availability",
      "alternative_contact",
      "other",
    ].includes(recordType)
  ) {
    return "out-of-office";
  }
  return "custom";
}

export function isXeroSourceType(sourceType: string): boolean {
  return sourceType === "xero" || sourceType === "xero_leave";
}
