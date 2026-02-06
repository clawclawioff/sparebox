import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import { SpareboxLogo } from "@/components/sparebox-logo";

export const metadata: Metadata = {
  title: "Blog — Sparebox",
  description:
    "Insights on AI agents, hosting, and the future of P2P compute. Guides, tutorials, and industry analysis from the Sparebox team.",
  openGraph: {
    title: "Sparebox Blog",
    description:
      "Insights on AI agents, hosting, and the future of P2P compute.",
    url: "https://sparebox.dev/blog",
    siteName: "Sparebox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sparebox Blog",
    description:
      "Insights on AI agents, hosting, and the future of P2P compute.",
  },
  alternates: {
    canonical: "https://sparebox.dev/blog",
  },
};

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-orange-50 via-amber-50 to-amber-100/50 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <SpareboxLogo variant="full" size="md" href="/" />
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-stone-600 hover:text-stone-900 transition"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-orange-600 font-medium"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="text-stone-600 hover:text-stone-900 transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-32">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-stone-900 tracking-tight">
            Blog
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto">
            Insights on AI agents, hosting, and the future of P2P compute.
          </p>
        </div>

        {/* Posts grid */}
        {posts.length === 0 ? (
          <p className="text-center text-stone-500">No posts yet. Check back soon!</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div className="p-6">
                  {/* Tag */}
                  {post.frontmatter.tags?.[0] && (
                    <span className="inline-block text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full mb-3">
                      {post.frontmatter.tags[0]}
                    </span>
                  )}

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-stone-900 mb-2 group-hover:text-orange-700 transition line-clamp-2">
                    {post.frontmatter.title}
                  </h2>

                  {/* Description */}
                  <p className="text-stone-500 text-sm leading-relaxed mb-4 line-clamp-3">
                    {post.frontmatter.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <time dateTime={post.frontmatter.date}>
                      {new Date(post.frontmatter.date).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </time>
                    <span>·</span>
                    <span>{post.readingTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <SpareboxLogo variant="full" size="sm" />
          <p className="text-stone-500 text-sm">
            © 2026 Sparebox. Open infrastructure for personal AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
