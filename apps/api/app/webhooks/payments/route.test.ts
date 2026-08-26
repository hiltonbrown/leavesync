import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getFirstActiveOrganisationIdForClerkOrg: vi.fn(),
  inngestSend: vi.fn(() => Promise.resolve()),
  isStripeEventProcessed: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  recordStripeEvent: vi.fn(() => Promise.resolve()),
  resolvePlanKey: vi.fn(),
  upsertSubscriptionFromWebhook: vi.fn(() => Promise.resolve()),
}));

vi.mock("@repo/billing", () => ({
  constructEvent: mocks.constructEvent,
  resolvePlanKey: mocks.resolvePlanKey,
}));
vi.mock("@repo/database", () => ({
  getFirstActiveOrganisationIdForClerkOrg:
    mocks.getFirstActiveOrganisationIdForClerkOrg,
  isStripeEventProcessed: mocks.isStripeEventProcessed,
  recordStripeEvent: mocks.recordStripeEvent,
  upsertSubscriptionFromWebhook: mocks.upsertSubscriptionFromWebhook,
}));
vi.mock("@repo/jobs", () => ({
  inngest: { send: mocks.inngestSend },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: mocks.logError, info: mocks.logInfo, warn: mocks.logWarn },
}));
vi.mock("@/env", () => ({
  env: { STRIPE_WEBHOOK_SECRET: "whsec_test" },
}));

const { POST } = await import("./route");

function webhookRequest() {
  return new Request("http://localhost/webhooks/payments", {
    body: "{}",
    headers: { "stripe-signature": "sig" },
    method: "POST",
  });
}

function subscriptionEvent(overrides: Record<string, unknown> = {}) {
  return {
    created: 1_700_000_100,
    data: {
      object: {
        cancel_at_period_end: false,
        current_period_end: 1_700_000_000,
        customer: "cus_1",
        id: "sub_1",
        items: { data: [{ price: { id: "price_basic" } }] },
        metadata: { clerk_org_id: "org_1" },
        status: "active",
        ...overrides,
      },
    },
    id: "evt_1",
    type: "customer.subscription.updated",
  };
}

describe("Stripe payments webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirstActiveOrganisationIdForClerkOrg.mockResolvedValue(
      "30000000-0000-4000-8000-000000000001"
    );
    mocks.isStripeEventProcessed.mockResolvedValue(false);
    mocks.resolvePlanKey.mockReturnValue({ ok: true, value: "basic" });
  });

  it("returns 400 when the signature cannot be verified", async () => {
    mocks.constructEvent.mockReturnValue({
      error: {
        code: "bad_request",
        message: "Invalid Stripe webhook signature.",
      },
      ok: false,
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(mocks.isStripeEventProcessed).not.toHaveBeenCalled();
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  it("skips events that have already been processed", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent(),
    });
    mocks.isStripeEventProcessed.mockResolvedValue(true);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.upsertSubscriptionFromWebhook).not.toHaveBeenCalled();
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  it("mirrors subscription events and records the event after processing", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent(),
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.upsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkOrgId: "org_1",
        planKey: "basic",
        status: "active",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      })
    );
    expect(mocks.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationId: "30000000-0000-4000-8000-000000000001",
        }),
        name: "recount-usage",
      })
    );
    expect(mocks.recordStripeEvent).toHaveBeenCalledWith(
      "evt_1",
      "customer.subscription.updated"
    );

    // The event must only be recorded once the mirror write has completed, so
    // a failure mid-processing leaves the event un-recorded for Stripe to retry.
    const [mirrorOrder] =
      mocks.upsertSubscriptionFromWebhook.mock.invocationCallOrder;
    const [recordOrder] = mocks.recordStripeEvent.mock.invocationCallOrder;
    expect(recordOrder).toBeGreaterThan(mirrorOrder);
  });

  it("does not mirror when the price maps to no known plan", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent(),
    });
    mocks.resolvePlanKey.mockReturnValue({
      error: { code: "bad_request", message: "Unknown Stripe price." },
      ok: false,
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.upsertSubscriptionFromWebhook).not.toHaveBeenCalled();
    expect(mocks.recordStripeEvent).toHaveBeenCalledTimes(1);
  });

  it("ignores subscription events missing clerk_org_id metadata", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent({ metadata: null }),
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.upsertSubscriptionFromWebhook).not.toHaveBeenCalled();
    expect(mocks.recordStripeEvent).toHaveBeenCalledTimes(1);
  });

  it("passes event.created as stripeEventCreatedAt into the subscription mirror", async () => {
    const eventCreatedSeconds = 1_700_000_100;
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent(),
    });

    await POST(webhookRequest());

    expect(mocks.upsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventCreatedAt: new Date(eventCreatedSeconds * 1000),
      })
    );
  });

  it("passes a later event.created for a newer event (newer-wins path)", async () => {
    const newerCreatedSeconds = 1_700_001_000;
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: { ...subscriptionEvent(), created: newerCreatedSeconds },
    });

    await POST(webhookRequest());

    expect(mocks.upsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        planKey: "basic",
        status: "active",
        stripeEventCreatedAt: new Date(newerCreatedSeconds * 1000),
      })
    );
  });

  it("passes an earlier event.created for an older event (stale-event path)", async () => {
    // The route always threads the timestamp through; the DB guard decides whether
    // to apply the write. This test confirms the older timestamp reaches the upsert
    // so the guard can compare it.
    const olderCreatedSeconds = 1_699_999_000;
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: { ...subscriptionEvent(), created: olderCreatedSeconds },
    });

    await POST(webhookRequest());

    expect(mocks.upsertSubscriptionFromWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventCreatedAt: new Date(olderCreatedSeconds * 1000),
      })
    );
  });

  it("skips a subscription event failing schema validation, logs an error, and still records the event", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: {
        created: 1_700_000_100,
        data: { object: { not: "a subscription" } },
        id: "evt_bad",
        type: "customer.subscription.updated",
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.logError).toHaveBeenCalledWith(
      "Stripe subscription event failed validation and was skipped.",
      expect.objectContaining({
        eventId: "evt_bad",
        eventType: "customer.subscription.updated",
      })
    );
    expect(mocks.upsertSubscriptionFromWebhook).not.toHaveBeenCalled();
    expect(mocks.recordStripeEvent).toHaveBeenCalledWith(
      "evt_bad",
      "customer.subscription.updated"
    );
  });

  it("logs an unhandled event type at info level and still records it", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: {
        created: 1_700_000_100,
        data: { object: {} },
        id: "evt_charge",
        type: "charge.succeeded",
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.logInfo).toHaveBeenCalledWith(
      "Stripe event type not handled.",
      expect.objectContaining({
        eventId: "evt_charge",
        eventType: "charge.succeeded",
      })
    );
    expect(mocks.recordStripeEvent).toHaveBeenCalledWith(
      "evt_charge",
      "charge.succeeded"
    );
  });

  it("propagates the error and does not record the event when the mirror write rejects", async () => {
    mocks.constructEvent.mockReturnValue({
      ok: true,
      value: subscriptionEvent(),
    });
    mocks.upsertSubscriptionFromWebhook.mockRejectedValueOnce(
      new Error("database unavailable")
    );

    await expect(POST(webhookRequest())).rejects.toThrow(
      "database unavailable"
    );

    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });
});
