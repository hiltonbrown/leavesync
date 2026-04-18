export type FieldOwner = "leavesync" | "xero";

export interface FieldOwnership {
  avatarUrl: "leavesync";
  email: FieldOwner;
  firstName: FieldOwner;
  jobTitle: FieldOwner;
  lastName: FieldOwner;
  location: "leavesync";
  manager: "leavesync";
  personType: "leavesync";
  startDate: FieldOwner;
  statusNote: "leavesync";
  team: "leavesync";
}

export function fieldOwnershipForPerson(input: {
  xeroEmployeeId: string | null;
}): FieldOwnership {
  const syncedOwner: FieldOwner = input.xeroEmployeeId ? "xero" : "leavesync";

  return {
    avatarUrl: "leavesync",
    email: syncedOwner,
    firstName: syncedOwner,
    jobTitle: syncedOwner,
    lastName: syncedOwner,
    location: "leavesync",
    manager: "leavesync",
    personType: "leavesync",
    startDate: syncedOwner,
    statusNote: "leavesync",
    team: "leavesync",
  };
}
