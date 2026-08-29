import { env } from "@/env";
import { resolveAuthLinks } from "./auth-link-values";

export const { signInHref, signUpHref } = resolveAuthLinks({
  appUrl: env.NEXT_PUBLIC_APP_URL,
  vercelEnv: env.NEXT_PUBLIC_VERCEL_ENV,
});
