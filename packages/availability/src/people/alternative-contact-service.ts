import "server-only";

import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { database, scopedQuery } from "@repo/database";
import { z } from "zod";
import type { AlternativeContactSnapshot, PeopleRole } from "./people-service";

export type AlternativeContactServiceError =
  | { code: "contact_not_found"; message: string }
  | { code: "cross_org_leak"; message: string }
  | { code: "not_authorised"; message: string }
  | { code: "person_not_found"; message: string }
  | { code: "reorder_mismatch"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

const RoleSchema = z.enum(["admin", "manager", "owner", "viewer"]);
const BaseInputSchema = z.object({
  actingPersonId: z.string().uuid().nullable(),
  actingRole: RoleSchema,
  actingUserId: z.string().min(1).optional(),
  clerkOrgId: z.string().min(1),
  organisationId: z.string().uuid(),
});

const ContactFieldsSchema = z
  .object({
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    name: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    role: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Add an email address or phone number.",
    path: ["email"],
  });

const AddContactSchema = BaseInputSchema.merge(ContactFieldsSchema).extend({
  personId: z.string().uuid(),
});

const ContactPatchSchema = z
  .object({
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    name: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    role: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

const UpdateContactSchema = BaseInputSchema.extend({
  contactId: z.string().uuid(),
  patch: ContactPatchSchema,
});

const DeleteContactSchema = BaseInputSchema.extend({
  contactId: z.string().uuid(),
});

const ReorderContactsSchema = BaseInputSchema.extend({
  orderedContactIds: z.array(z.string().uuid()),
  personId: z.string().uuid(),
});

export async function addAlternativeContact(input: {
  actingPersonId: null | string;
  actingRole: PeopleRole;
  actingUserId?: string;
  clerkOrgId: string;
  email?: string;
  name: string;
  notes?: string;
  organisationId: string;
  personId: string;
  phone?: string;
  role?: string;
}): Promise<
  Result<AlternativeContactSnapshot, AlternativeContactServiceError>
> {
  const parsed = AddContactSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const scoped = scopedQuery(
      parsed.data.clerkOrgId as ClerkOrgId,
      parsed.data.organisationId as OrganisationId
    );
    const person = await database.person.findFirst({
      where: {
        ...scoped,
        id: parsed.data.personId,
      },
      select: { id: true, manager_person_id: true },
    });
    if (!person) {
      return await personNotFoundOrLeak(parsed.data);
    }
    if (
      !canMutate(person, parsed.data.actingPersonId, parsed.data.actingRole)
    ) {
      return notAuthorised();
    }

    const contact = await database.$transaction(async (tx) => {
      const lastContact = await tx.alternativeContact.findFirst({
        where: {
          ...scoped,
          person_id: person.id,
        },
        orderBy: { display_order: "desc" },
        select: { display_order: true },
      });
      const created = await tx.alternativeContact.create({
        data: {
          clerk_org_id: parsed.data.clerkOrgId,
          display_order: (lastContact?.display_order ?? -1) + 1,
          email: emptyToNull(parsed.data.email),
          name: parsed.data.name,
          notes: emptyToNull(parsed.data.notes),
          organisation_id: parsed.data.organisationId,
          person_id: person.id,
          phone: emptyToNull(parsed.data.phone),
          role: emptyToNull(parsed.data.role),
        },
        select: alternativeContactSelect,
      });
      await tx.auditEvent.create({
        data: auditData(
          parsed.data,
          "alternative_contacts.added",
          person.id,
          created.id,
          {
            contactId: created.id,
            personId: person.id,
          }
        ),
      });
      return created;
    });

    return { ok: true, value: toAlternativeContactSnapshot(contact) };
  } catch {
    return unknownError("Failed to add alternative contact.");
  }
}

export async function updateAlternativeContact(input: {
  actingPersonId: null | string;
  actingRole: PeopleRole;
  actingUserId?: string;
  clerkOrgId: string;
  contactId: string;
  organisationId: string;
  patch: {
    email?: string;
    name?: string;
    notes?: string;
    phone?: string;
    role?: string;
  };
}): Promise<
  Result<AlternativeContactSnapshot, AlternativeContactServiceError>
> {
  const parsed = UpdateContactSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const scoped = scopedQuery(
      parsed.data.clerkOrgId as ClerkOrgId,
      parsed.data.organisationId as OrganisationId
    );
    const existing = await loadContact(scoped, parsed.data.contactId);
    if (!existing) {
      return await contactNotFoundOrLeak(parsed.data);
    }
    if (
      !canMutate(
        existing.person,
        parsed.data.actingPersonId,
        parsed.data.actingRole
      )
    ) {
      return notAuthorised();
    }
    const merged = {
      email: existing.email ?? undefined,
      name: parsed.data.patch.name ?? existing.name,
      phone: existing.phone ?? undefined,
      ...parsed.data.patch,
    };
    const contactFields = ContactFieldsSchema.safeParse(merged);
    if (!contactFields.success) {
      return validationError(contactFields.error);
    }

    const updated = await database.$transaction(async (tx) => {
      const row = await tx.alternativeContact.update({
        data: {
          email:
            parsed.data.patch.email === undefined
              ? undefined
              : emptyToNull(parsed.data.patch.email),
          name: parsed.data.patch.name,
          notes:
            parsed.data.patch.notes === undefined
              ? undefined
              : emptyToNull(parsed.data.patch.notes),
          phone:
            parsed.data.patch.phone === undefined
              ? undefined
              : emptyToNull(parsed.data.patch.phone),
          role:
            parsed.data.patch.role === undefined
              ? undefined
              : emptyToNull(parsed.data.patch.role),
        },
        select: alternativeContactSelect,
        where: { id: existing.id },
      });
      await tx.auditEvent.create({
        data: auditData(
          parsed.data,
          "alternative_contacts.updated",
          existing.person_id,
          existing.id,
          {
            contactId: existing.id,
            personId: existing.person_id,
          }
        ),
      });
      return row;
    });

    return { ok: true, value: toAlternativeContactSnapshot(updated) };
  } catch {
    return unknownError("Failed to update alternative contact.");
  }
}

export async function deleteAlternativeContact(input: {
  actingPersonId: null | string;
  actingRole: PeopleRole;
  actingUserId?: string;
  clerkOrgId: string;
  contactId: string;
  organisationId: string;
}): Promise<Result<{ personId: string }, AlternativeContactServiceError>> {
  const parsed = DeleteContactSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const scoped = scopedQuery(
      parsed.data.clerkOrgId as ClerkOrgId,
      parsed.data.organisationId as OrganisationId
    );
    const existing = await loadContact(scoped, parsed.data.contactId);
    if (!existing) {
      return await contactNotFoundOrLeak(parsed.data);
    }
    if (
      !canMutate(
        existing.person,
        parsed.data.actingPersonId,
        parsed.data.actingRole
      )
    ) {
      return notAuthorised();
    }

    await database.$transaction(async (tx) => {
      await tx.alternativeContact.delete({ where: { id: existing.id } });
      const remaining = await tx.alternativeContact.findMany({
        where: {
          ...scoped,
          person_id: existing.person_id,
        },
        orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
        select: { id: true },
      });
      for (const [displayOrder, contact] of remaining.entries()) {
        await tx.alternativeContact.update({
          data: { display_order: displayOrder },
          where: { id: contact.id },
        });
      }
      await tx.auditEvent.create({
        data: auditData(
          parsed.data,
          "alternative_contacts.deleted",
          existing.person_id,
          existing.id,
          {
            contactId: existing.id,
            personId: existing.person_id,
          }
        ),
      });
    });

    return { ok: true, value: { personId: existing.person_id } };
  } catch {
    return unknownError("Failed to delete alternative contact.");
  }
}

export async function reorderAlternativeContacts(input: {
  actingPersonId: null | string;
  actingRole: PeopleRole;
  actingUserId?: string;
  clerkOrgId: string;
  orderedContactIds: string[];
  organisationId: string;
  personId: string;
}): Promise<Result<{ personId: string }, AlternativeContactServiceError>> {
  const parsed = ReorderContactsSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const scoped = scopedQuery(
      parsed.data.clerkOrgId as ClerkOrgId,
      parsed.data.organisationId as OrganisationId
    );
    const person = await database.person.findFirst({
      where: {
        ...scoped,
        id: parsed.data.personId,
      },
      select: { id: true, manager_person_id: true },
    });
    if (!person) {
      return await personNotFoundOrLeak(parsed.data);
    }
    if (
      !canMutate(person, parsed.data.actingPersonId, parsed.data.actingRole)
    ) {
      return notAuthorised();
    }

    const existing = await database.alternativeContact.findMany({
      where: {
        ...scoped,
        person_id: person.id,
      },
      orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
      select: { id: true },
    });
    if (
      !sameIdSet(
        existing.map((contact) => contact.id),
        parsed.data.orderedContactIds
      )
    ) {
      return {
        ok: false,
        error: {
          code: "reorder_mismatch",
          message: "Contact order does not match the current contact set.",
        },
      };
    }

    await database.$transaction(async (tx) => {
      for (const [
        displayOrder,
        contactId,
      ] of parsed.data.orderedContactIds.entries()) {
        await tx.alternativeContact.update({
          data: { display_order: displayOrder },
          where: { id: contactId },
        });
      }
      await tx.auditEvent.create({
        data: auditData(
          parsed.data,
          "alternative_contacts.reordered",
          person.id,
          person.id,
          {
            orderedContactIds: parsed.data.orderedContactIds,
            personId: person.id,
          }
        ),
      });
    });

    return { ok: true, value: { personId: person.id } };
  } catch {
    return unknownError("Failed to reorder alternative contacts.");
  }
}

const alternativeContactSelect = {
  display_order: true,
  email: true,
  id: true,
  name: true,
  notes: true,
  person_id: true,
  phone: true,
  role: true,
} as const;

function loadContact(
  scoped: { clerk_org_id: ClerkOrgId; organisation_id: OrganisationId },
  contactId: string
) {
  return database.alternativeContact.findFirst({
    where: {
      ...scoped,
      id: contactId,
    },
    select: {
      ...alternativeContactSelect,
      person: {
        select: {
          id: true,
          manager_person_id: true,
        },
      },
    },
  });
}

function canMutate(
  person: { id: string; manager_person_id: string | null },
  actingPersonId: null | string,
  actingRole: PeopleRole
): boolean {
  return (
    actingRole === "admin" ||
    actingRole === "owner" ||
    actingPersonId === person.id ||
    (Boolean(actingPersonId) && person.manager_person_id === actingPersonId)
  );
}

function auditData(
  input: {
    actingPersonId: null | string;
    actingUserId?: string;
    clerkOrgId: string;
    organisationId: string;
  },
  action: string,
  personId: string,
  resourceId: string,
  payload: Record<string, unknown>
) {
  return {
    action,
    actor_user_id: input.actingUserId ?? null,
    clerk_org_id: input.clerkOrgId,
    organisation_id: input.organisationId,
    payload: {
      ...payload,
      actingPersonId: input.actingPersonId,
    },
    resource_id: resourceId,
    resource_type: personId === resourceId ? "person" : "alternative_contact",
  };
}

function toAlternativeContactSnapshot(contact: {
  display_order: number;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
  role: string | null;
}): AlternativeContactSnapshot {
  return {
    displayOrder: contact.display_order,
    email: contact.email,
    id: contact.id,
    name: contact.name,
    notes: contact.notes,
    phone: contact.phone,
    role: contact.role,
  };
}

async function personNotFoundOrLeak(input: {
  clerkOrgId: string;
  organisationId: string;
  personId: string;
}): Promise<Result<never, AlternativeContactServiceError>> {
  const exists = await database.person.findFirst({
    where: { id: input.personId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return crossOrgLeak();
  }
  return {
    ok: false,
    error: { code: "person_not_found", message: "Person not found." },
  };
}

async function contactNotFoundOrLeak(input: {
  clerkOrgId: string;
  contactId: string;
  organisationId: string;
}): Promise<Result<never, AlternativeContactServiceError>> {
  const exists = await database.alternativeContact.findFirst({
    where: { id: input.contactId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return crossOrgLeak();
  }
  return {
    ok: false,
    error: { code: "contact_not_found", message: "Contact not found." },
  };
}

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validationError(
  error: z.ZodError
): Result<never, AlternativeContactServiceError> {
  return {
    ok: false,
    error: {
      code: "validation_error",
      message: error.issues[0]?.message ?? "Invalid alternative contact.",
    },
  };
}

function notAuthorised(): Result<never, AlternativeContactServiceError> {
  return {
    ok: false,
    error: {
      code: "not_authorised",
      message: "You do not have permission to manage these contacts.",
    },
  };
}

function crossOrgLeak(): Result<never, AlternativeContactServiceError> {
  return {
    ok: false,
    error: {
      code: "cross_org_leak",
      message: "Contact is outside this organisation.",
    },
  };
}

function unknownError(
  message: string
): Result<never, AlternativeContactServiceError> {
  return {
    ok: false,
    error: {
      code: "unknown_error",
      message,
    },
  };
}
