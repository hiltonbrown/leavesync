import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      GITHUB_OWNER: z.string().min(1).optional(),
      GITHUB_REPO: z.string().min(1).optional(),
      GITHUB_TOKEN: z.string().min(1).optional(),
    },
    runtimeEnv: {
      GITHUB_OWNER: process.env.GITHUB_OWNER,
      GITHUB_REPO: process.env.GITHUB_REPO,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    },
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation.
    emptyStringAsUndefined: true,
  });
