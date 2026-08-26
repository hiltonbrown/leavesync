import { describe, expect, it } from "vitest";
import { isSensitiveKey, sanitizeObject } from "./scrubber";

describe("observability scrubber", () => {
  it("allows the exact operational keys", () => {
    for (const key of [
      "actingClerkOrgId",
      "clerkOrgId",
      "errorCode",
      "stripeSubscriptionId",
      "xeroWriteSucceeded",
    ]) {
      expect(isSensitiveKey(key)).toBe(false);
    }
  });

  it("continues to scrub near-miss credential keys", () => {
    for (const key of [
      "clerkSecret",
      "stripeWebhookSecret",
      "xeroAccessToken",
    ]) {
      expect(isSensitiveKey(key)).toBe(true);
    }
  });

  it("recursively scrubs nested objects and arrays", () => {
    expect(
      sanitizeObject({
        nested: { token: "secret" },
        rows: [{ password: "secret" }],
      })
    ).toEqual({
      nested: { token: "[SCRUBBED]" },
      rows: [{ password: "[SCRUBBED]" }],
    });
  });

  it("lets a sensitive parent dominate an allowlisted child", () => {
    expect(sanitizeObject({ rawPayload: { clerkOrgId: "org_1" } })).toEqual({
      rawPayload: "[SCRUBBED]",
    });
  });

  it("normalises errors without retaining a canary", () => {
    const error = new Error("LEAK_CANARY");
    error.stack = "LEAK_CANARY";
    Object.assign(error, { custom: "LEAK_CANARY" });
    const result = sanitizeObject({ error });
    expect(result).toEqual({ error: { name: "Error" } });
    expect(JSON.stringify(result)).not.toContain("LEAK_CANARY");
  });

  it.each([
    [{ error: "runtime text" }, { error: "[SCRUBBED]" }],
    [
      { nested: { error: "runtime text" } },
      { nested: { error: "[SCRUBBED]" } },
    ],
    [{ ErRoR: "runtime text" }, { ErRoR: "[SCRUBBED]" }],
    [{ error: { detail: "runtime text" } }, { error: "[SCRUBBED]" }],
  ])("scrubs non-Error exception channels", (input, expected) => {
    expect(sanitizeObject(input)).toEqual(expected);
  });

  it("keeps safe error codes visible", () => {
    expect(sanitizeObject({ errorCode: "APPROVAL_FAILED" })).toEqual({
      errorCode: "APPROVAL_FAILED",
    });
  });

  it("scrubs exception-shaped object fields", () => {
    expect(
      sanitizeObject({
        cause: "secret",
        message: "secret",
        params: "secret",
        query: "secret",
        response: "secret",
      })
    ).toEqual({
      cause: "[SCRUBBED]",
      message: "[SCRUBBED]",
      params: "[SCRUBBED]",
      query: "[SCRUBBED]",
      response: "[SCRUBBED]",
    });
  });

  it("does not mutate its input", () => {
    const input = { nested: { token: "secret", useful: true } };
    const before = structuredClone(input);
    sanitizeObject(input);
    expect(input).toEqual(before);
  });
});
