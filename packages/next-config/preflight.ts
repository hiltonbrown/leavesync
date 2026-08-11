import { type LaunchMode, launchModeSchema } from "./launch-mode";

export type AppName = "app" | "api" | "web";

export interface PreflightOptions {
  appName: AppName;
  envVars?: Record<string, string | undefined>;
  launchMode?: LaunchMode;
}

export interface PreflightResult {
  appName: AppName;
  checkedVars: string[];
  launchMode: LaunchMode;
  ok: true;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidUrl = (value: string): boolean => {
  try {
    const _parsedUrl = new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

export const runProductionPreflight = (
  options: PreflightOptions
): PreflightResult => {
  const { appName, envVars = process.env, launchMode: explicitMode } = options;
  const errors: string[] = [];
  const checkedVars: string[] = [];

  const rawMode = explicitMode || envVars.NEXT_PUBLIC_LAUNCH_MODE?.trim();
  const parsedMode = launchModeSchema.safeParse(rawMode);

  if (!parsedMode.success) {
    errors.push(
      `NEXT_PUBLIC_LAUNCH_MODE is missing or invalid. Must be "early_access" or "paid".`
    );
  }
  checkedVars.push("NEXT_PUBLIC_LAUNCH_MODE");

  const mode: LaunchMode = parsedMode.success
    ? parsedMode.data
    : "early_access";

  const checkPresent = (varName: string) => {
    checkedVars.push(varName);
    const val = envVars[varName]?.trim();
    if (!val) {
      errors.push(`${varName} is missing or empty`);
      return false;
    }
    return true;
  };

  const checkUrl = (varName: string) => {
    checkedVars.push(varName);
    const val = envVars[varName]?.trim();
    if (!val) {
      errors.push(`${varName} is missing or empty`);
      return false;
    }
    if (!isValidUrl(val)) {
      errors.push(`${varName} must be a valid URL`);
      return false;
    }
    return true;
  };

  const checkEmail = (varName: string, fallbackDefault?: string) => {
    checkedVars.push(varName);
    const val = envVars[varName]?.trim() || fallbackDefault;
    if (!val) {
      errors.push(`${varName} is missing or empty`);
      return false;
    }
    if (!isValidEmail(val)) {
      errors.push(`${varName} must be a valid email address`);
      return false;
    }
    return true;
  };

  const checkPair = (var1: string, var2: string, var1IsUrl = false) => {
    checkedVars.push(var1, var2);
    const val1 = envVars[var1]?.trim();
    const val2 = envVars[var2]?.trim();

    if ((val1 && !val2) || (!val1 && val2)) {
      errors.push(`${var1} and ${var2} must be configured together`);
      return false;
    }

    if (!(val1 || val2)) {
      errors.push(`${var1} and ${var2} pair is missing`);
      return false;
    }

    if (val1 && var1IsUrl && !isValidUrl(val1)) {
      errors.push(`${var1} must be a valid URL`);
      return false;
    }

    return true;
  };

  // Check common required variables for all apps
  checkUrl("NEXT_PUBLIC_APP_URL");
  checkUrl("NEXT_PUBLIC_WEB_URL");
  checkUrl("NEXT_PUBLIC_API_URL");
  checkUrl("NEXT_PUBLIC_SENTRY_DSN");

  if (appName === "web") {
    const supportEmail =
      envVars.SUPPORT_EMAIL ||
      envVars.NEXT_PUBLIC_SUPPORT_EMAIL ||
      envVars.RESEND_FROM ||
      "support@teamcalendar.online";
    checkEmail("SUPPORT_EMAIL", supportEmail);
  }

  if (appName === "app" || appName === "api") {
    checkPresent("DATABASE_URL");
    checkPresent("XERO_TOKEN_ENCRYPTION_KEY");
    checkPresent("XERO_CLIENT_ID");
    checkPresent("XERO_CLIENT_SECRET");
    checkPresent("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    checkPresent("CLERK_SECRET_KEY");

    checkPair("KV_REST_API_URL", "KV_REST_API_TOKEN", true);
  }

  if (appName === "api") {
    checkPresent("CLERK_WEBHOOK_SECRET");
    checkPair("INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY");

    checkedVars.push("RESEND_TOKEN");
    const resendToken =
      envVars.RESEND_TOKEN?.trim() || envVars.RESEND_API_KEY?.trim();
    if (!resendToken) {
      errors.push("RESEND_TOKEN (or RESEND_API_KEY) is missing or empty");
    }
  }

  // Paid mode checks
  if (mode === "paid") {
    if (appName === "app" || appName === "api") {
      checkPresent("STRIPE_SECRET_KEY");
      checkPresent("STRIPE_PRICE_BASIC");
      checkPresent("STRIPE_PRICE_PREMIUM");
      checkUrl("STRIPE_PORTAL_RETURN_URL");
    }
    if (appName === "api") {
      checkPresent("STRIPE_WEBHOOK_SECRET");
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Production preflight failed for app "${appName}" in mode "${mode}":\n` +
        errors.map((e) => `  - ${e}`).join("\n")
    );
  }

  return {
    appName,
    checkedVars: Array.from(new Set(checkedVars)),
    launchMode: mode,
    ok: true,
  };
};
