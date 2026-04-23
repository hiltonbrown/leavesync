import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { bundleMDX } from "mdx-bundler";

const contentDir = path.join(process.cwd(), "src/content/blog");

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  author?: string;
}

export interface PostMeta {
  slug: string;
  frontmatter: PostFrontmatter;
}

export interface Post extends PostMeta {
  code: string;
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const filePath = path.join(contentDir, `${slug}.mdx`);
    const source = await readFile(filePath, "utf-8");
    const { code, frontmatter } = await bundleMDX<PostFrontmatter>({ source });
    return { code, frontmatter, slug };
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<PostMeta[]> {
  try {
    const files = await readdir(contentDir);
    const posts = await Promise.all(
      files
        .filter((f) => f.endsWith(".mdx"))
        .map(async (file) => {
          const slug = file.replace(".mdx", "");
          const post = await getPost(slug);
          if (!post) return null;
          return { slug, frontmatter: post.frontmatter };
        })
    );
    return posts
      .filter((p): p is PostMeta => p !== null)
      .sort(
        (a, b) =>
          new Date(b.frontmatter.date).getTime() -
          new Date(a.frontmatter.date).getTime()
      );
  } catch {
    return [];
  }
}
