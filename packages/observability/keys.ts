import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    },
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
      BETTERSTACK_URL: process.env.BETTERSTACK_URL,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    },
    server: {
      BETTERSTACK_API_KEY: z.string().optional(),
      BETTERSTACK_URL: z.string().url().optional(),

      // Added by Sentry Integration, Vercel Marketplace
      SENTRY_ORG: z.string().optional(),
      SENTRY_PROJECT: z.string().optional(),
    },
  });
