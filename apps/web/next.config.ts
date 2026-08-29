import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";
import { signInHref, signUpHref } from "@/src/lib/auth-links";

const webConfig: NextConfig = {
  ...config,
  async redirects() {
    return [
      {
        destination: signInHref,
        permanent: false,
        source: "/sign-in",
      },
      {
        destination: signInHref,
        permanent: false,
        source: "/login",
      },
      {
        destination: signUpHref,
        permanent: false,
        source: "/sign-up",
      },
      {
        destination: signUpHref,
        permanent: false,
        source: "/register",
      },
    ];
  },
};

let nextConfig: NextConfig = withLogging(webConfig);

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
