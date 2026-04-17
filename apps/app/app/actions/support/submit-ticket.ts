"use server";

import { auth, clerkClient } from "@repo/auth/server";
import { resend } from "@repo/email";
import { log } from "@repo/observability/log";
import { z } from "zod";
import { env } from "@/env";

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
    if (!(resend && env.RESEND_FROM)) {
      return { ok: false, error: "Support email is not configured" };
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const org = await clerk.organizations.getOrganization({
      organizationId: orgId,
    });
    const userEmail = user.emailAddresses[0]?.emailAddress;

    await resend.emails.send({
      from: env.RESEND_FROM,
      to: env.RESEND_FROM,
      replyTo: userEmail,
      subject: `[LeaveSync ${type}] ${subject}`,
      text: [
        `Type: ${type}`,
        `Subject: ${subject}`,
        `Description: ${description}`,
        `User: ${user.fullName ?? userId}${userEmail ? ` (${userEmail})` : ""}`,
        `Org: ${org.name} (${orgId})`,
      ].join("\n"),
    });

    return { ok: true, value: undefined };
  } catch (error) {
    log.error("Failed to submit support ticket", { error });
    return { ok: false, error: "Failed to submit support ticket" };
  }
};
