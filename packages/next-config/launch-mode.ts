import { z } from "zod";

export const launchModeSchema = z.enum(["early_access", "paid"]);

export type LaunchMode = z.infer<typeof launchModeSchema>;

export const isProductionEnvironment = (): boolean => {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  return nodeEnv === "production" || vercelEnv === "production";
};

export const getLaunchMode = (): LaunchMode => {
  const rawMode = process.env.NEXT_PUBLIC_LAUNCH_MODE?.trim();

  if (rawMode) {
    const parsed = launchModeSchema.safeParse(rawMode);
    if (parsed.success) {
      return parsed.data;
    }
    throw new Error(
      `Invalid NEXT_PUBLIC_LAUNCH_MODE: "${rawMode}". Must be "early_access" or "paid".`
    );
  }

  if (isProductionEnvironment()) {
    throw new Error(
      "NEXT_PUBLIC_LAUNCH_MODE environment variable is required in production. Must be 'early_access' or 'paid'."
    );
  }

  return "early_access";
};

export const isEarlyAccess = (): boolean => getLaunchMode() === "early_access";

export const isPaidLaunch = (): boolean => getLaunchMode() === "paid";
