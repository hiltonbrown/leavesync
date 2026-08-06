import { resolveCanonicalWebUrl } from "@repo/seo/canonical-url";
import type { MetadataRoute } from "next";
import { env } from "@/env";

const url = resolveCanonicalWebUrl({
  vercelProjectProductionUrl: env.VERCEL_PROJECT_PRODUCTION_URL,
  webUrl: env.NEXT_PUBLIC_WEB_URL,
});

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", url.href).href,
  };
}
