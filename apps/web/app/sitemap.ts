import fs from "node:fs";
import { resolveCanonicalWebUrl } from "@repo/seo/canonical-url";
import type { MetadataRoute } from "next";
import { env } from "@/env";
import { getAllPosts } from "@/src/lib/blog";

const appFolders = fs.readdirSync("app", { withFileTypes: true });
const pages = appFolders
  .filter((file) => file.isDirectory())
  .filter((folder) => !folder.name.startsWith("_"))
  .filter((folder) => !folder.name.startsWith("("))
  .map((folder) => folder.name);
const blogs = (await getAllPosts()).map((post) => post.slug);
const url = resolveCanonicalWebUrl({
  vercelProjectProductionUrl: env.VERCEL_PROJECT_PRODUCTION_URL,
  webUrl: env.NEXT_PUBLIC_WEB_URL,
});

const sitemap = async (): Promise<MetadataRoute.Sitemap> => [
  {
    lastModified: new Date(),
    url: new URL("/", url).href,
  },
  ...pages.map((page) => ({
    lastModified: new Date(),
    url: new URL(page, url).href,
  })),
  ...blogs.map((slug) => ({
    lastModified: new Date(),
    url: new URL(`blog/${slug}`, url).href,
  })),
];

export default sitemap;
