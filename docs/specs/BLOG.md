# Blog Implementation Spec

> Status: Draft
> Last updated: 2026-02-06
> Related: [CONTENT_STRATEGY.md](../CONTENT_STRATEGY.md)

## Overview

A blog for Sparebox that serves as the primary content marketing channel, optimized for AEO/GEO (AI citation) and traditional SEO. Blog posts are authored as MDX files, rendered by Next.js with full schema markup and SEO metadata.

---

## Architecture

### Content Storage

Blog posts are stored as MDX files in the project:

```
src/
  content/
    blog/
      hosting-ai-agents-guide.mdx
      ai-agent-hardware-requirements.mdx
      earn-money-spare-hardware.mdx
      ...
```

**Why MDX:**
- Markdown for easy authoring
- JSX for custom components (callouts, comparison tables, FAQs)
- Frontmatter for metadata
- Git-tracked — version history, PR reviews for content

### Frontmatter Schema

Every blog post includes this frontmatter:

```yaml
---
title: "How to Host an AI Agent in 2026: The Complete Guide"
description: "The easiest way to host an AI agent in 2026 — comparing self-hosting, cloud VMs, and P2P marketplaces like Sparebox."
date: "2026-02-06"
lastUpdated: "2026-02-06"
author: "sparebox-team"
tags:
  - ai-agents
  - hosting
  - tutorial
image: "/blog/images/hosting-ai-agents-guide.webp"
imageAlt: "Illustration of an AI agent running on distributed hardware"
schema: "article"        # article | howto | faq
draft: false
targetQueries:
  - "how to host AI agent"
  - "AI agent hosting"
  - "best AI agent hosting 2026"
---
```

**Field details:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✅ | H1 and `<title>` tag. 50-65 chars ideal. |
| `description` | string | ✅ | Meta description. 150-160 chars. |
| `date` | string (ISO) | ✅ | Original publish date. |
| `lastUpdated` | string (ISO) | ✅ | For freshness signals. |
| `author` | string | ✅ | Author slug, maps to author data. |
| `tags` | string[] | ✅ | Used for filtering and related posts. |
| `image` | string | ❌ | Hero image path. Falls back to default. |
| `imageAlt` | string | ❌ | Alt text for hero image. |
| `schema` | string | ✅ | Determines JSON-LD schema type. |
| `draft` | boolean | ❌ | If `true`, excluded from production build. |
| `targetQueries` | string[] | ❌ | Internal use — tracks which AI queries this targets. |

### Routing

| Route | Page | Description |
|-------|------|-------------|
| `/blog` | Blog listing | All published posts, paginated |
| `/blog/[slug]` | Individual post | Full article with TOC, schema, etc. |
| `/blog/tag/[tag]` | Tag listing | Posts filtered by tag |

**Slug** is derived from the MDX filename (e.g., `hosting-ai-agents-guide.mdx` → `/blog/hosting-ai-agents-guide`).

### Rendering

- **Server-side rendered (SSR)** or **Static Site Generation (SSG)** — use `generateStaticParams` for build-time rendering
- SSG preferred for performance; rebuild triggered on content changes
- MDX compiled at build time using `next-mdx-remote` or `@next/mdx`

---

## Pages

### 1. `/blog` — Blog Listing Page

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Nav (with Blog link active)                │
├─────────────────────────────────────────────┤
│                                             │
│  Blog                                       │
│  Insights on AI agents, hosting, and the    │
│  future of P2P compute.                     │
│                                             │
│  [All] [AI Agents] [Hosting] [Earning] ...  │  ← Tag filters
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Hero Image  │  │  Hero Image  │          │
│  │  Title       │  │  Title       │          │
│  │  Description │  │  Description │          │
│  │  Date · 8min │  │  Date · 5min │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  ...         │  │  ...         │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  [← Prev]  Page 1 of 3  [Next →]           │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

**Features:**
- Grid of post cards (2 columns desktop, 1 mobile)
- Each card: hero image, title, description snippet, date, reading time, primary tag
- Tag filter bar — click a tag to filter posts
- Pagination — 10 posts per page
- Sort by date (newest first)
- Draft posts excluded in production

### 2. `/blog/[slug]` — Individual Post Page

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Nav                                        │
├─────────────────────────────────────────────┤
│                                             │
│  Tag · 8 min read                           │
│  # How to Host an AI Agent in 2026          │
│  Description / subtitle text                │
│  Sparebox Team · Feb 6, 2026                │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Hero Image                          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌────────┐  ┌──────────────────────────┐   │
│  │  TOC   │  │  Article body            │   │
│  │  ----  │  │                          │   │
│  │  H2    │  │  Markdown content with   │   │
│  │  H2    │  │  custom MDX components   │   │
│  │  H2    │  │                          │   │
│  │  FAQ   │  │  ...                     │   │
│  │        │  │                          │   │
│  └────────┘  └──────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Author Card                         │   │
│  │  [Avatar] Sparebox Team              │   │
│  │  Building the future of P2P compute  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  CTA Banner                          │   │
│  │  Ready to host your AI agent?        │   │
│  │  [Join the Waitlist]                 │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Related Posts                              │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ Post 1 │ │ Post 2 │ │ Post 3 │          │
│  └────────┘ └────────┘ └────────┘          │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

**Features:**
- Reading time calculated from word count (~200 WPM)
- Table of contents — auto-generated from H2/H3 headings, sticky on desktop sidebar
- Share buttons — copy link, Twitter/X, LinkedIn
- Author card at bottom with avatar and bio
- CTA banner after article content
- Related posts — 3 posts matching the same tags
- "Last updated" date displayed
- Smooth scroll to heading on TOC click

### 3. Navigation Updates

Add "Blog" link to:
- **Landing page nav** — between existing links, before CTA button
- **Dashboard nav** — in the sidebar or top nav
- Mobile menu as well

---

## Schema Markup

All schema delivered as JSON-LD in `<script type="application/ld+json">` in the `<head>`.

### Article Schema (every post)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Host an AI Agent in 2026: The Complete Guide",
  "description": "The easiest way to host an AI agent in 2026...",
  "image": "https://sparebox.dev/blog/images/hosting-ai-agents-guide.webp",
  "author": {
    "@type": "Organization",
    "name": "Sparebox",
    "url": "https://sparebox.dev"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Sparebox",
    "logo": {
      "@type": "ImageObject",
      "url": "https://sparebox.dev/logo.png"
    }
  },
  "datePublished": "2026-02-06",
  "dateModified": "2026-02-06",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://sparebox.dev/blog/hosting-ai-agents-guide"
  }
}
```

### FAQPage Schema (posts with FAQ sections)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does it cost to host an AI agent?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AI agent hosting costs range from $0 (self-hosted) to $50-200/month (cloud). P2P marketplaces like Sparebox start at $10/month."
      }
    }
  ]
}
```

### HowTo Schema (tutorial posts)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Deploy an AI Agent on Sparebox",
  "description": "Step-by-step guide to deploying your first AI agent.",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "10"
  },
  "totalTime": "PT15M",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Create a Sparebox account",
      "text": "Sign up at sparebox.dev and verify your email."
    }
  ]
}
```

### Organization Schema (site-wide, on layout)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sparebox",
  "url": "https://sparebox.dev",
  "logo": "https://sparebox.dev/logo.png",
  "description": "P2P AI agent hosting marketplace. Connecting AI agents with reliable hardware from everyday hosts.",
  "sameAs": [
    "https://twitter.com/spareboxdev",
    "https://github.com/sparebox"
  ]
}
```

---

## Design

### Theme

Match the existing Sparebox earthy design system:

| Token | Value | Usage |
|-------|-------|-------|
| `--terracotta` | `#C75B3F` | Accent, CTAs, links |
| `--warm-cream` | `#FAF5EF` | Background |
| `--stone-900` | `#1C1917` | Headings, primary text |
| `--stone-600` | `#57534E` | Body text |
| `--stone-400` | `#A8A29E` | Muted text, dates |
| `--stone-200` | `#E7E5E4` | Borders, dividers |
| `--sage` | `#7C8C6E` | Success, tags |

### Typography

- **Font:** Inter (already in use site-wide)
- **Headings:** Inter, semibold (600)
- **Body:** Inter, regular (400), `text-stone-600`
- **Line height:** 1.75 for body text (relaxed, readable)
- **Max content width:** 720px (optimal reading width)
- **Font sizes:**
  - H1: 2.25rem (36px)
  - H2: 1.5rem (24px)
  - H3: 1.25rem (20px)
  - Body: 1.125rem (18px)
  - Small: 0.875rem (14px)

### Components

**Post card (listing page):**
- Rounded corners (`rounded-xl`)
- Subtle shadow on hover
- Image aspect ratio 16:9
- Tag pill in top-left of image
- Title truncated to 2 lines

**Author card:**
- Horizontal layout: avatar (48px circle) + name + bio
- Subtle background (`bg-stone-50`)
- Rounded corners

**CTA banner:**
- Full-width within content column
- Terracotta background with cream text
- Single CTA button (warm cream bg, terracotta text)
- Brief copy: "Ready to host your AI agent?" + "Join the Sparebox waitlist and get early access."

**Table of contents:**
- Sticky sidebar on desktop (top: 100px)
- Hidden on mobile (collapsed into toggle)
- Active heading highlighted
- Smooth scroll on click

---

## MDX Features

### Custom Components

Build these reusable components for use in MDX:

#### `<Callout>`

```jsx
<Callout type="info">
  Sparebox is currently in early access. Join the waitlist to get notified.
</Callout>
```

Types: `info` (blue), `warning` (amber), `tip` (green), `important` (terracotta)

Renders as a styled box with icon + message.

#### `<ComparisonTable>`

```jsx
<ComparisonTable
  headers={["Feature", "Self-Host", "Cloud VM", "Sparebox"]}
  rows={[
    ["Monthly Cost", "$0 + electricity", "$50-200", "$10-30"],
    ["Setup Time", "2-4 hours", "30 min", "5 min"],
    ["Uptime", "~95%", "99.9%", "99.5%"],
  ]}
  highlight={3}  // Column to highlight (Sparebox)
/>
```

Renders as a styled, responsive table with the highlighted column having a subtle terracotta tint.

#### `<FAQ>`

```jsx
<FAQ items={[
  {
    question: "How much does AI agent hosting cost?",
    answer: "Costs range from $0 (self-hosted) to $200/month (cloud). Sparebox starts at $10/month."
  },
  // ...
]} />
```

Renders as collapsible accordion. Also injects FAQPage JSON-LD schema automatically.

#### `<CodeBlock>`

Enhanced code block with:
- Syntax highlighting (via `shiki` or `rehype-pretty-code`)
- Copy button
- Language label
- Line numbers (optional)
- Line highlighting (optional)

### Image Optimization

- All images via `next/image` for automatic optimization
- WebP format preferred
- Lazy loading by default, hero image eager
- Images stored in `public/blog/images/`
- Custom MDX image component wrapping `next/image`

### Table of Contents Generation

- Parse MDX headings (H2, H3) at build time
- Generate TOC data structure: `{ id, text, level }[]`
- Pass to client-side TOC component
- Heading IDs auto-generated from text (slugified)

---

## Sitemap & SEO

### Sitemap

Auto-generate `sitemap.xml` using Next.js `sitemap.ts` (App Router):

```typescript
// src/app/sitemap.ts
import { getBlogPosts } from '@/lib/blog'

export default async function sitemap() {
  const posts = await getBlogPosts()

  const blogUrls = posts.map(post => ({
    url: `https://sparebox.dev/blog/${post.slug}`,
    lastModified: post.lastUpdated,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: 'https://sparebox.dev', lastModified: new Date(), priority: 1.0 },
    { url: 'https://sparebox.dev/blog', lastModified: new Date(), priority: 0.9 },
    ...blogUrls,
  ]
}
```

### robots.txt

```
User-agent: *
Allow: /

Sitemap: https://sparebox.dev/sitemap.xml
```

Allow all crawlers — we want maximum indexability. AI crawlers (GPTBot, Anthropic, etc.) should be explicitly allowed.

### Open Graph & Twitter Cards

Every blog post includes in `<head>`:

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="How to Host an AI Agent in 2026" />
<meta property="og:description" content="The easiest way to host..." />
<meta property="og:image" content="https://sparebox.dev/blog/images/hosting-guide.webp" />
<meta property="og:url" content="https://sparebox.dev/blog/hosting-ai-agents-guide" />
<meta property="og:site_name" content="Sparebox" />
<meta property="article:published_time" content="2026-02-06" />
<meta property="article:modified_time" content="2026-02-06" />
<meta property="article:author" content="Sparebox Team" />
<meta property="article:tag" content="ai-agents" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="How to Host an AI Agent in 2026" />
<meta name="twitter:description" content="The easiest way to host..." />
<meta name="twitter:image" content="https://sparebox.dev/blog/images/hosting-guide.webp" />
```

### Canonical URLs

Every page includes `<link rel="canonical" href="https://sparebox.dev/blog/[slug]" />` to prevent duplicate content issues.

---

## Implementation Plan

### Dependencies to Add

```json
{
  "next-mdx-remote": "^5.x",
  "gray-matter": "^4.x",
  "reading-time": "^1.x",
  "rehype-pretty-code": "^0.x",
  "rehype-slug": "^6.x",
  "rehype-autolink-headings": "^7.x",
  "remark-gfm": "^4.x",
  "shiki": "^1.x"
}
```

### File Structure

```
src/
  app/
    blog/
      page.tsx              # Blog listing
      [slug]/
        page.tsx            # Individual post
      tag/
        [tag]/
          page.tsx          # Tag filter page
    sitemap.ts              # Auto-generated sitemap
  components/
    blog/
      PostCard.tsx           # Card for listing page
      PostHeader.tsx         # Post title, meta, hero
      TableOfContents.tsx    # Sticky TOC sidebar
      AuthorCard.tsx         # Author info at bottom
      RelatedPosts.tsx       # Related posts section
      CTABanner.tsx          # Post-article CTA
      ShareButtons.tsx       # Social share buttons
      TagFilter.tsx          # Tag filter bar
      Pagination.tsx         # Pagination controls
    mdx/
      Callout.tsx            # Callout component
      ComparisonTable.tsx    # Comparison table
      FAQ.tsx                # FAQ accordion + schema
      CodeBlock.tsx          # Enhanced code block
      MDXImage.tsx           # next/image wrapper
  content/
    blog/
      *.mdx                 # Blog posts
  lib/
    blog.ts                 # Blog utilities (getPost, getPosts, etc.)
    mdx.ts                  # MDX compilation config
    schema.ts               # JSON-LD schema generators
    reading-time.ts         # Reading time calculator
  data/
    authors.ts              # Author metadata
```

### Build Order

1. **Phase 1 — Core:** Blog utilities (`lib/blog.ts`), MDX compilation, basic post page
2. **Phase 2 — Listing:** Blog listing page with cards and pagination
3. **Phase 3 — Polish:** TOC, author card, related posts, CTA banner, share buttons
4. **Phase 4 — MDX Components:** Callout, ComparisonTable, FAQ, CodeBlock
5. **Phase 5 — SEO:** Schema markup, sitemap, Open Graph, robots.txt
6. **Phase 6 — Content:** Publish first batch of blog posts

### Performance Targets

- **Lighthouse score:** 95+ across all metrics
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **Blog listing page:** < 200KB total (no heavy images above fold without lazy load)
