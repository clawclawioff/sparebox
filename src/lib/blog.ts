import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export interface BlogPostFrontmatter {
  title: string;
  description: string;
  date: string;
  lastUpdated?: string;
  author: string;
  tags: string[];
  image?: string;
  imageAlt?: string;
  schema?: string;
  draft?: boolean;
  targetQueries?: string[];
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
  readingTime: string;
}

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const filePath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      const frontmatter = data as BlogPostFrontmatter;

      // Filter out drafts in production
      if (frontmatter.draft && process.env.NODE_ENV === "production") {
        return null;
      }

      return {
        slug,
        frontmatter,
        content,
        readingTime: readingTime(content).text,
      };
    })
    .filter(Boolean) as BlogPost[];

  // Sort by date, newest first
  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}

export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = data as BlogPostFrontmatter;

  return {
    slug,
    frontmatter,
    content,
    readingTime: readingTime(content).text,
  };
}
