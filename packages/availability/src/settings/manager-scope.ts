import "server-only";

import { database } from "@repo/database";
import { getSettings } from "./organisation-settings-service";

export async function managerScopePersonIds(input: {
  actingPersonId: string;
  clerkOrgId: string;
  organisationId: string;
}): Promise<string[]> {
  const [settingsResult, people] = await Promise.all([
    getSettings({
      clerkOrgId: input.clerkOrgId,
      organisationId: input.organisationId,
    }),
    database.person.findMany({
      where: {
        archived_at: null,
        clerk_org_id: input.clerkOrgId,
        organisation_id: input.organisationId,
      },
      orderBy: { id: "asc" },
      select: { id: true, manager_person_id: true },
    }),
  ]);

  if (!settingsResult.ok) {
    return [input.actingPersonId];
  }

  if (settingsResult.value.managerVisibilityScope === "all_team_leave") {
    return [
      input.actingPersonId,
      ...transitiveReportIds(people, input.actingPersonId),
    ];
  }

  return [
    input.actingPersonId,
    ...people
      .filter((person) => person.manager_person_id === input.actingPersonId)
      .map((person) => person.id),
  ];
}

function transitiveReportIds(
  people: ReadonlyArray<{ id: string; manager_person_id: string | null }>,
  managerId: string
): string[] {
  const byManager = new Map<string, string[]>();
  for (const person of people) {
    if (!person.manager_person_id) {
      continue;
    }
    byManager.set(person.manager_person_id, [
      ...(byManager.get(person.manager_person_id) ?? []),
      person.id,
    ]);
  }

  const queue = [...(byManager.get(managerId) ?? [])];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const next = queue.shift();
    if (!(next && !seen.has(next) && next !== managerId)) {
      continue;
    }
    seen.add(next);
    queue.push(...(byManager.get(next) ?? []));
  }

  return [...seen];
}
