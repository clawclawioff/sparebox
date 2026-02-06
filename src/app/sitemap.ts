import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogPosts();

  const blogUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://sparebox.dev/blog/${post.slug}`,
    lastModified: new Date(
      post.frontmatter.lastUpdated || post.frontmatter.date
    ),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: "https://sparebox.dev",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: "https://sparebox.dev/pricing",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://sparebox.dev/blog",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...blogUrls,
  ];
}
