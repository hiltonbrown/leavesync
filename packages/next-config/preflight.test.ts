import { describe, expect, it } from "vitest";
import { type AppName, runProductionPreflight } from "./preflight";

const SECRET_CANARY_VALUE = "secret_canary_value_123456789";

const validCommonVars = {
  NEXT_PUBLIC_API_URL: "https://api.teamcalendar.online",
  NEXT_PUBLIC_APP_URL: "https://app.teamcalendar.online",
  NEXT_PUBLIC_LAUNCH_MODE: "early_access",
  NEXT_PUBLIC_SENTRY_DSN: "https://sentrykey@o1234.ingest.sentry.io/5678",
  NEXT_PUBLIC_WEB_URL: "https://teamcalendar.online",
};

const validAppVars = {
  ...validCommonVars,
  CLERK_SECRET_KEY: "clerk_sec_123456",
  DATABASE_URL:
    "postgresql://postgres:secretpassword@localhost:5432/teamcalendar",
  KV_REST_API_TOKEN: "kv_token_123",
  KV_REST_API_URL: "https://kv.upstash.io",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123456",
  XERO_CLIENT_ID: "xero_client_id_123",
  XERO_CLIENT_SECRET: "xero_client_secret_123",
  XERO_TOKEN_ENCRYPTION_KEY: "dGhpcyBpcyBhIDMyIGJ5dGUgc2VjcmV0IGtleSE=",
};

const validApiVars = {
  ...validAppVars,
  CLERK_WEBHOOK_SECRET: "whsec_clerk123",
  INNGEST_EVENT_KEY: "ingest_event_key_123",
  INNGEST_SIGNING_KEY: "signkey-prod-123",
  RESEND_TOKEN: "re_123456789",
};

const validWebVars = {
  ...validCommonVars,
  SUPPORT_EMAIL: "support@teamcalendar.online",
};

const validPaidVars = {
  STRIPE_PORTAL_RETURN_URL: "https://app.teamcalendar.online/settings/billing",
  STRIPE_PRICE_BASIC: "price_basic_123",
  STRIPE_PRICE_PREMIUM: "price_premium_123",
  STRIPE_SECRET_KEY: SECRET_CANARY_VALUE,
  STRIPE_WEBHOOK_SECRET: "whsec_stripe123",
};

describe("production preflight validation", () => {
  it("passes for valid early_access app deployment", () => {
    const result = runProductionPreflight({
      appName: "app",
      envVars: validAppVars,
    });
    expect(result.ok).toBe(true);
    expect(result.launchMode).toBe("early_access");
  });

  it("passes for valid early_access api deployment", () => {
    const result = runProductionPreflight({
      appName: "api",
      envVars: validApiVars,
    });
    expect(result.ok).toBe(true);
    expect(result.launchMode).toBe("early_access");
  });

  it("passes for valid early_access web deployment", () => {
    const result = runProductionPreflight({
      appName: "web",
      envVars: validWebVars,
    });
    expect(result.ok).toBe(true);
    expect(result.launchMode).toBe("early_access");
  });

  it("passes for valid paid app deployment when all Stripe keys exist", () => {
    const result = runProductionPreflight({
      appName: "app",
      envVars: {
        ...validAppVars,
        ...validPaidVars,
        NEXT_PUBLIC_LAUNCH_MODE: "paid",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.launchMode).toBe("paid");
  });

  it("fails when NEXT_PUBLIC_LAUNCH_MODE is missing or invalid", () => {
    expect(() =>
      runProductionPreflight({
        appName: "app",
        envVars: { ...validAppVars, NEXT_PUBLIC_LAUNCH_MODE: "invalid" },
      })
    ).toThrow("NEXT_PUBLIC_LAUNCH_MODE is missing or invalid");
  });

  it("fails when a required URL variable is not a valid URL", () => {
    expect(() =>
      runProductionPreflight({
        appName: "app",
        envVars: { ...validAppVars, NEXT_PUBLIC_APP_URL: "not-a-url" },
      })
    ).toThrow("NEXT_PUBLIC_APP_URL must be a valid URL");
  });

  it("fails atomically when KV credentials pair is half-configured", () => {
    const halfKv = { ...validAppVars, KV_REST_API_TOKEN: undefined };
    expect(() =>
      runProductionPreflight({
        appName: "app",
        envVars: halfKv,
      })
    ).toThrow(
      "KV_REST_API_URL and KV_REST_API_TOKEN must be configured together"
    );
  });

  it("fails atomically when Inngest credentials pair is half-configured on api", () => {
    const halfInngest = { ...validApiVars, INNGEST_SIGNING_KEY: undefined };
    expect(() =>
      runProductionPreflight({
        appName: "api",
        envVars: halfInngest,
      })
    ).toThrow(
      "INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY must be configured together"
    );
  });

  it("fails paid mode when Stripe keys are missing", () => {
    expect(() =>
      runProductionPreflight({
        appName: "app",
        envVars: { ...validAppVars, NEXT_PUBLIC_LAUNCH_MODE: "paid" },
      })
    ).toThrow("STRIPE_SECRET_KEY is missing or empty");
  });

  it("never prints or includes secret values in failure messages", () => {
    try {
      runProductionPreflight({
        appName: "app",
        envVars: {
          ...validAppVars,
          ...validPaidVars,
          NEXT_PUBLIC_APP_URL: "invalid-url",
          NEXT_PUBLIC_LAUNCH_MODE: "paid",
        },
      });
      expect.fail("Expected preflight to throw error");
    } catch (err) {
      const errorMsg = (err as Error).message;
      expect(errorMsg).not.toContain(SECRET_CANARY_VALUE);
      expect(errorMsg).not.toContain("secretpassword");
      expect(errorMsg).toContain("NEXT_PUBLIC_APP_URL must be a valid URL");
    }
  });

  const getValidVarsForApp = (appName: AppName) => {
    if (appName === "app") {
      return validAppVars;
    }
    if (appName === "api") {
      return validApiVars;
    }
    return validWebVars;
  };

  const apps: AppName[] = ["app", "api", "web"];
  for (const appName of apps) {
    it(`fails ${appName} when NEXT_PUBLIC_SENTRY_DSN is missing`, () => {
      const vars = {
        ...getValidVarsForApp(appName),
        NEXT_PUBLIC_SENTRY_DSN: "",
      };
      expect(() => runProductionPreflight({ appName, envVars: vars })).toThrow(
        "NEXT_PUBLIC_SENTRY_DSN is missing or empty"
      );
    });
  }
});
