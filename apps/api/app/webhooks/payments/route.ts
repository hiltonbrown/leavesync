import { constructEvent, resolvePlanKey } from "@repo/billing";
import {
  getFirstActiveOrganisationIdForClerkOrg,
  getSubscriptionForOrg,
  getSubscriptionForStripeCustomer,
  isStripeEventProcessed,
  recordStripeEvent,
  upsertSubscriptionFromWebhook,
} from "@repo/database";
import { inngest } from "@repo/jobs";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";

const MetadataSchema = z
  .object({ clerk_org_id: z.string().min(1).optional() })
  .nullable();
const StripeRef = z.union([z.string(), z.object({ id: z.string() })]);
const SessionSchema = z.object({
  customer: StripeRef.nullable(),
  metadata: MetadataSchema,
  subscription: StripeRef.nullable(),
});
const SubscriptionSchema = z.object({
  cancel_at_period_end: z.boolean().default(false),
  current_period_end: z.number().nullable().optional(),
  customer: StripeRef,
  ended_at: z.number().nullable().optional(),
  id: z.string(),
  items: z.object({
    data: z.array(z.object({ price: z.object({ id: z.string() }) })).min(1),
  }),
  metadata: MetadataSchema,
  status: z.string(),
});
// An invoice references its subscription either by id (the unexpanded default)
// or as the full expanded subscription object, which we mirror directly.
const InvoiceSchema = z.object({
  subscription: z.union([z.string(), SubscriptionSchema]).nullable().optional(),
});

const objectId = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? null);
const dateFromSeconds = (value: number | null | undefined) =>
  value ? new Date(value * 1000) : null;

interface MirrorResult {
  error?: string;
  ok: boolean;
  status?: number;
}

async function mirrorSubscription(
  data: z.infer<typeof SubscriptionSchema>,
  eventCreatedAt: Date
): Promise<MirrorResult> {
  const clerkOrgId = data.metadata?.clerk_org_id;
  if (!clerkOrgId) {
    log.error("Stripe subscription event missing clerk_org_id metadata.", {
      stripeSubscriptionId: data.id,
    });
    return { ok: true };
  }
  const priceId = data.items.data[0]?.price.id;
  const plan = resolvePlanKey(priceId);
  if (!plan.ok) {
    log.error("Stripe subscription event used an unknown price.", {
      priceId,
      stripeSubscriptionId: data.id,
    });
    return { ok: true };
  }

  const stripeCustomerId = objectId(data.customer);
  const [orgBinding, customerBinding] = await Promise.all([
    getSubscriptionForOrg(clerkOrgId),
    stripeCustomerId
      ? getSubscriptionForStripeCustomer(stripeCustomerId)
      : Promise.resolve(null),
  ]);

  const orgBoundToDifferentCustomer = Boolean(
    orgBinding?.stripe_customer_id &&
      stripeCustomerId &&
      orgBinding.stripe_customer_id !== stripeCustomerId
  );

  const customerBoundToDifferentOrg = Boolean(
    customerBinding?.clerk_org_id && customerBinding.clerk_org_id !== clerkOrgId
  );

  if (orgBoundToDifferentCustomer || customerBoundToDifferentOrg) {
    log.error("Stripe subscription tenant cross-check conflict detected.", {
      clerkOrgId,
      customerBoundOrgId: customerBinding?.clerk_org_id ?? null,
      orgBoundCustomerId: orgBinding?.stripe_customer_id ?? null,
      stripeCustomerId,
      stripeSubscriptionId: data.id,
    });
    return {
      error: "Stripe customer and organisation identity conflict",
      ok: false,
      status: 409,
    };
  }

  await upsertSubscriptionFromWebhook({
    cancelAtPeriodEnd: data.cancel_at_period_end,
    clerkOrgId,
    currentPeriodEnd: dateFromSeconds(data.current_period_end),
    endedAt: dateFromSeconds(data.ended_at),
    planKey: plan.value,
    status: data.status,
    stripeCustomerId,
    stripeEventCreatedAt: eventCreatedAt,
    stripeSubscriptionId: data.id,
  });
  const organisationId =
    await getFirstActiveOrganisationIdForClerkOrg(clerkOrgId);
  if (!organisationId) {
    log.error(
      "Stripe subscription mirror skipped recount-usage because no active organisation was found.",
      {
        clerkOrgId,
        stripeSubscriptionId: data.id,
      }
    );
    return { ok: true };
  }
  await inngest.send({
    data: {
      clerkOrgId,
      organisationId,
    },
    name: "recount-usage",
  });
  return { ok: true };
}

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
const INVOICE_EVENT_TYPES = new Set(["invoice.payment_failed", "invoice.paid"]);

// Only the fields these handlers read; avoids importing the Stripe SDK type
// into a route that otherwise depends on it only via @repo/billing.
interface StripeEventLike {
  created: number;
  data: { object: unknown };
  id: string;
  type: string;
}

async function handleSubscriptionEvent(
  event: StripeEventLike
): Promise<MirrorResult> {
  const parsed = SubscriptionSchema.safeParse(event.data.object);
  if (parsed.success) {
    return await mirrorSubscription(
      parsed.data,
      dateFromSeconds(event.created) ?? new Date()
    );
  }
  log.error("Stripe subscription event failed validation and was skipped.", {
    eventId: event.id,
    eventType: event.type,
    issues: parsed.error.issues,
  });
  return { ok: true };
}

async function handleInvoiceEvent(
  event: StripeEventLike
): Promise<MirrorResult> {
  const parsed = InvoiceSchema.safeParse(event.data.object);
  if (!parsed.success) {
    log.error("Stripe invoice event failed validation and was skipped.", {
      eventId: event.id,
      eventType: event.type,
      issues: parsed.error.issues,
    });
    return { ok: true };
  }
  const { subscription } = parsed.data;
  if (subscription && typeof subscription !== "string") {
    return await mirrorSubscription(
      subscription,
      dateFromSeconds(event.created) ?? new Date()
    );
  }
  if (subscription) {
    log.info(
      "Stripe invoice event carried no expanded subscription and was skipped.",
      { eventId: event.id, eventType: event.type }
    );
  }
  return { ok: true };
}

function checkCheckoutSessionMetadata(event: StripeEventLike) {
  const parsed = SessionSchema.safeParse(event.data.object);
  if (parsed.success && !parsed.data.metadata?.clerk_org_id) {
    log.warn("Stripe checkout session missing clerk_org_id metadata.");
  }
}

async function processStripeEvent(
  event: StripeEventLike
): Promise<MirrorResult> {
  if (event.type === "checkout.session.completed") {
    checkCheckoutSessionMetadata(event);
    return { ok: true };
  }
  if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    return await handleSubscriptionEvent(event);
  }
  if (INVOICE_EVENT_TYPES.has(event.type)) {
    return await handleInvoiceEvent(event);
  }
  log.info("Stripe event type not handled.", {
    eventId: event.id,
    eventType: event.type,
  });
  return { ok: true };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const eventResult = constructEvent(
    rawBody,
    request.headers.get("stripe-signature"),
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!eventResult.ok) {
    return NextResponse.json(
      { error: eventResult.error.message },
      { status: 400 }
    );
  }
  const event = eventResult.value;
  // Skip events we have already mirrored. We only record the event after
  // processing succeeds (below), so a failure leaves no row and Stripe's retry
  // reprocesses it. Mirror writes are idempotent, so a duplicate is harmless.
  if (await isStripeEventProcessed(event.id)) {
    return NextResponse.json({ received: true });
  }

  const result = await processStripeEvent(event);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 409 }
    );
  }

  await recordStripeEvent(event.id, event.type);
  return NextResponse.json({ received: true });
}
