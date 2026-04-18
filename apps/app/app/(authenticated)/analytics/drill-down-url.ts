export function buildCalendarDrillDownUrl({
  customEnd,
  customStart,
  org,
  personId,
  preset,
  recordType,
  teamId,
}: {
  customEnd?: string;
  customStart?: string;
  org?: string | null;
  personId?: string | null;
  preset: string;
  recordType?: string | null;
  teamId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("view", "week");
  params.set("recordTypeCategory", "all");
  params.set("approvalStatus", "approved");
  if (org) {
    params.set("org", org);
  }
  if (preset === "custom" && customStart) {
    params.set("anchor", customStart);
  }
  if (personId) {
    params.set("scopeType", "person");
    params.set("scopeValue", personId);
  } else if (teamId) {
    params.set("scopeType", "team");
    params.set("scopeValue", teamId);
  }
  if (recordType) {
    params.set("recordType", recordType);
  }
  if (customEnd) {
    params.set("customEnd", customEnd);
  }
  return `/calendar?${params.toString()}`;
}

export function buildPeopleDrillDownUrl({
  org,
  personId,
  teamId,
}: {
  org?: string | null;
  personId?: string | null;
  teamId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (org) {
    params.set("org", org);
  }
  if (teamId) {
    params.set("teamId", teamId);
  }
  if (personId) {
    params.set("search", personId);
  }
  const query = params.toString();
  return query ? `/people?${query}` : "/people";
}
