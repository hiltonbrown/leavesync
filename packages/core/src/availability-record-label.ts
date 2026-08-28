export const AVAILABILITY_RECORD_TYPES = [
  "leave",
  "annual_leave",
  "personal_leave",
  "holiday",
  "sick_leave",
  "long_service_leave",
  "unpaid_leave",
  "public_holiday",
  "wfh",
  "travel",
  "travelling",
  "training",
  "client_site",
  "another_office",
  "offsite_meeting",
  "contractor_unavailable",
  "limited_availability",
  "alternative_contact",
  "other",
  "leave_request",
] as const;

export type AvailabilityRecordType = (typeof AVAILABILITY_RECORD_TYPES)[number];

export const AVAILABILITY_RECORD_TYPE_LABELS: Record<
  AvailabilityRecordType,
  string
> = {
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
} as const;

export const formatAvailabilityRecordType = (
  recordType: AvailabilityRecordType
): string => AVAILABILITY_RECORD_TYPE_LABELS[recordType];

export const getAvailabilityRecordLabel = (
  recordType: AvailabilityRecordType | (string & {})
): string => {
  if (recordType in AVAILABILITY_RECORD_TYPE_LABELS) {
    return AVAILABILITY_RECORD_TYPE_LABELS[
      recordType as AvailabilityRecordType
    ];
  }
  return recordType
    .split("_")
    .map((part) =>
      part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ""
    )
    .join(" ");
};
