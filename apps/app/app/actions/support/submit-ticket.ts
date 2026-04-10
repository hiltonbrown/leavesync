"use server";

import { auth, clerkClient } from "@repo/auth/server";
import { z } from "zod";

const SubmitTicketSchema = z.object({
  type: z.enum(["support", "feedback", "bug"]),
  subject: z.string().min(1, "Subject is required").max(256),
  description: z.string().min(1, "Description is required").max(2048),
});

type SubmitTicketInput = z.infer<typeof SubmitTicketSchema>;

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export const submitTicket = async (
  input: SubmitTicketInput
): Promise<Result<void>> => {
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    return { ok: false, error: "Not authenticated" };
  }

  const parsed = SubmitTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { type, subject, description } = parsed.data;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const org = await clerk.organizations.getOrganization({
      organizationId: orgId,
    });

    // TODO: Send email, save to database, or post to webhook
    console.log(`[Support Ticket]
Type: ${type}
Subject: ${subject}
Description: ${description}
User: ${user.fullName} (${user.emailAddresses[0]?.emailAddress})
Org: ${org.name} (${orgId})
    `);

    return { ok: true, value: undefined };
  } catch (error) {
    console.error("Failed to submit ticket:", error);
    return { ok: false, error: "Failed to submit support ticket" };
  }
};
