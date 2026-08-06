import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    client: {
      NEXT_PUBLIC_API_URL: z.string().url().optional(),
      NEXT_PUBLIC_APP_URL: z.string().url().optional(),
      NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
      NEXT_PUBLIC_VERCEL_ENV: z
        .enum(["development", "preview", "production"])
        .optional(),
      NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
    },
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      ANALYZE: process.env.ANALYZE,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
      NEXT_PUBLIC_VERCEL_ENV:
        process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV,
      NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    server: {
      ANALYZE: z.string().optional(),

      // Added by Vercel
      NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

      // Vercel environment variables
      VERCEL: z.string().optional(),
      VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
      VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
      VERCEL_REGION: z.string().optional(),
      VERCEL_URL: z.string().optional(),
    },
  });
