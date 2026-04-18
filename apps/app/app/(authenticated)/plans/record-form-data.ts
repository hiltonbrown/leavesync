import "server-only";

import { auth, currentUser } from "@repo/auth/server";
import {
  getRecord,
  hasActiveXeroConnection,
  isXeroLeaveType,
} from "@repo/availability";
import { database, scopedQuery } from "@repo/database";
import { notFound, redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import type { PlanRecordFormInput } from "./_schemas";

interface LoadPlanFormDataInput {
  org?: string;
  recordId?: string;
}

export async function loadPlanFormData({
  org,
  recordId,
}: LoadPlanFormDataInput) {
  const user = await currentUser();
  const { orgRole } = await auth();
  if (!user) {
    redirect("/");
  }

  const { clerkOrgId, organisationId, orgQueryValue } =
    await requireActiveOrgPageContext(org);
  const currentPerson = await database.person.findFirst({
    where: {
      ...scopedQuery(clerkOrgId, organisationId),
      archived_at: null,
      clerk_user_id: user.id,
    },
    select: {
      email: true,
      first_name: true,
      id: true,
      last_name: true,
    },
  });

  const canSelectPerson =
    orgRole === "org:admin" ||
    orgRole === "org:owner" ||
    orgRole === "org:manager";
  let people: Array<{
    email: string;
    first_name: string | null;
    id: string;
    last_name: string | null;
  }> = [];
  if (canSelectPerson) {
    people = await database.person.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        archived_at: null,
        ...(orgRole === "org:manager" && currentPerson
          ? {
              OR: [
                { id: currentPerson.id },
                { manager_person_id: currentPerson.id },
              ],
            }
          : {}),
      },
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
      select: {
        email: true,
        first_name: true,
        id: true,
        last_name: true,
      },
    });
  } else if (currentPerson) {
    people = [currentPerson];
  }

  const hasXero = await hasActiveXeroConnection({ clerkOrgId, organisationId });
  const recordResult = recordId
    ? await getRecord({
        actingOrgRole: orgRole,
        actingUserId: user.id,
        clerkOrgId,
        organisationId,
        recordId,
      })
    : null;

  if (recordResult && !recordResult.ok) {
    notFound();
  }

  const record = recordResult?.ok
    ? {
        allDay: recordResult.value.allDay,
        contactabilityStatus: recordResult.value.contactabilityStatus,
        endsAt: dateInput(recordResult.value.endsAt),
        endTime: timeInput(recordResult.value.endsAt),
        id: recordResult.value.id,
        notesInternal: recordResult.value.notesInternal ?? "",
        personId: recordResult.value.personId,
        privacyMode: recordResult.value.privacyMode,
        recordType: recordResult.value
          .recordType as PlanRecordFormInput["recordType"],
        startsAt: dateInput(recordResult.value.startsAt),
        startTime: timeInput(recordResult.value.startsAt),
      }
    : undefined;

  const balancePersonId = record?.personId ?? people[0]?.id;
  const balanceRecordType = record?.recordType ?? "annual_leave";
  const balance =
    balancePersonId && isXeroLeaveType(balanceRecordType)
      ? await database.leaveBalance.findFirst({
          where: {
            ...scopedQuery(clerkOrgId, organisationId),
            person_id: balancePersonId,
            record_type: balanceRecordType,
          },
          orderBy: { updated_at: "desc" },
          select: { balance: true },
        })
      : null;

  return {
    balanceAvailable: balance ? Number(balance.balance) : null,
    canSelectPerson,
    closeHref: withOrg("/plans", orgQueryValue),
    hasActiveXeroConnection: hasXero,
    organisationId,
    people: people.map((person) => ({
      email: person.email,
      id: person.id,
      label: `${person.first_name} ${person.last_name}`,
    })),
    record,
  };
}

function dateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timeInput(date: Date): string {
  return date.toISOString().slice(11, 16);
}
