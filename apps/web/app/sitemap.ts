import { resolveCanonicalWebUrl } from "@repo/seo/canonical-url";
import type { MetadataRoute } from "next";
import { env } from "@/env";
import { getAllPosts } from "@/src/lib/blog";

export const publicRoutes = [
  "/",
  "/about",
  "/blog",
  "/careers",
  "/changelog",
  "/contact",
  "/customers",
  "/features",
  "/help-centre",
  "/help-centre/onboarding",
  "/integrations",
  "/pricing",
  "/privacy-policy",
  "/security",
  "/status",
  "/terms-of-service",
] as const;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const url = resolveCanonicalWebUrl({
    vercelProjectProductionUrl: env.VERCEL_PROJECT_PRODUCTION_URL,
    webUrl: env.NEXT_PUBLIC_WEB_URL,
  });
  const blogs = (await getAllPosts()).map((post) => post.slug);

  return [
    ...publicRoutes.map((route) => ({
      lastModified: new Date(),
      url: new URL(route, url).href,
    })),
    ...blogs.map((slug) => ({
      lastModified: new Date(),
      url: new URL(`/blog/${slug}`, url).href,
    })),
  ];
};

export default sitemap;
