import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      XERO_API_BASE_URL: z.url().optional(),
      XERO_CLIENT_ID: z.string().optional(),
      XERO_CLIENT_SECRET: z.string().optional(),
    },
    runtimeEnv: {
      XERO_API_BASE_URL: process.env.XERO_API_BASE_URL,
      XERO_CLIENT_ID: process.env.XERO_CLIENT_ID,
      XERO_CLIENT_SECRET: process.env.XERO_CLIENT_SECRET,
    },
  });
