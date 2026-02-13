import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { renderMDX } from "@/lib/mdx";
import { SpareboxLogo } from "@/components/sparebox-logo";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const { frontmatter } = post;
  const url = `https://sparebox.dev/blog/${slug}`;

  return {
    title: `${frontmatter.title} — Sparebox`,
    description: frontmatter.description,
    authors: [{ name: frontmatter.author }],
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url,
      siteName: "Sparebox",
      type: "article",
      publishedTime: frontmatter.date,
      modifiedTime: frontmatter.lastUpdated || frontmatter.date,
      authors: [frontmatter.author],
      tags: frontmatter.tags,
      ...(frontmatter.image && {
        images: [
          {
            url: `https://sparebox.dev${frontmatter.image}`,
            alt: frontmatter.imageAlt || frontmatter.title,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      ...(frontmatter.image && {
        images: [`https://sparebox.dev${frontmatter.image}`],
      }),
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const content = await renderMDX(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    ...(post.frontmatter.image && {
      image: `https://sparebox.dev${post.frontmatter.image}`,
    }),
    author: {
      "@type": "Organization",
      name: "Sparebox",
      url: "https://sparebox.dev",
    },
    publisher: {
      "@type": "Organization",
      name: "Sparebox",
      logo: {
        "@type": "ImageObject",
        url: "https://sparebox.dev/logo-icon.svg",
      },
    },
    datePublished: post.frontmatter.date,
    dateModified: post.frontmatter.lastUpdated || post.frontmatter.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://sparebox.dev/blog/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-orange-50 via-amber-50 to-amber-100/50 pointer-events-none" />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

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
      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-12 pb-32">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Post header */}
        <header className="mb-10">
          {/* Tags */}
          {post.frontmatter.tags?.[0] && (
            <span className="inline-block text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full mb-4">
              {post.frontmatter.tags[0]}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight leading-tight mb-4">
            {post.frontmatter.title}
          </h1>

          <p className="text-lg text-stone-500 mb-4">
            {post.frontmatter.description}
          </p>

          <div className="flex items-center gap-3 text-sm text-stone-400">
            <span>{post.frontmatter.author}</span>
            <span>·</span>
            <time dateTime={post.frontmatter.date}>
              {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
        </header>

        {/* Article body */}
        <article className="blog-prose">
          {content}
        </article>

        {/* CTA Banner */}
        <div className="mt-16 bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to host your AI agent?
          </h2>
          <p className="text-orange-100 mb-6 max-w-md mx-auto">
            Join the Sparebox waitlist and get early access to affordable,
            reliable AI agent hosting.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white hover:bg-orange-50 text-orange-700 font-medium px-6 py-3 rounded-xl transition shadow-sm"
          >
            Join the Waitlist →
          </Link>
        </div>
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
