# Uncoil content and storage map

## Choose the destination

| Request                                                         | Store/edit here                                    | Do not do                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Blog post, announcement article, engineering essay              | `content/blog/<slug>.mdoc`                         | Do not add a database/CMS record                                             |
| Blog image                                                      | `public/media/<descriptive-name>.<ext>`            | Do not use local filesystem paths in frontmatter                             |
| Internal architecture, runbook, decision, troubleshooting guide | `docs/<topic>.md`                                  | Do not expect it to appear at `/docs`                                        |
| Public SDK/API/product documentation                            | `content/docs/*.mdoc` through `src/lib/markdoc-docs.ts` | Keep public docs separate from `content/blog/*.mdoc`; do not put docs in the blog repository |
| In-dashboard quick reference                                    | `src/components/dashboard/docs-viewer.tsx` today   | Do not assume public-doc changes update it                                   |
| Historical design material                                      | `docs/archived/`                                   | Do not update archived files as current guidance                             |

## Blog frontmatter

Required:

```yaml
title: Clear reader-facing title
slug: stable-kebab-case-slug
excerpt: One concrete sentence describing the value.
publishedAt: 2026-08-13T12:00:00.000Z
author: Uncoil Team
draft: true
categories: [engineering]
tags: [AI agents, observability]
relatedPosts: [another-post-slug]
```

Optional media and SEO:

```yaml
heroImage:
  src: /media/article.jpg
  alt: Specific visual description
  card: /media/article-800x450.jpg
  hero: /media/article-1600x1067.jpg
  og: /media/article-1200x630.jpg
  caption: Source or context
seo:
  metaTitle: Search title under roughly 60 characters
  metaDescription: Specific search description under roughly 160 characters.
  canonicalUrl: https://www.uncoil.dev/blog/example
```

The filename may differ from the URL, but prefer matching the `slug`. Related posts use slugs. Category and tag values are strings.

## Publication behavior

- `draft: true`: excluded from listing, RSS, sitemap, static params, and direct public access.
- `draft: false`: included automatically after a successful build/deployment.
- Preserve the existing value while editing unless publication is explicitly requested.

## Media handling

Use descriptive lowercase filenames. Prefer WebP/JPEG for photographs and SVG/PNG for diagrams when appropriate. Avoid committing unnecessary source exports. Verify every referenced file exists under `public/media` and every image has useful alt text; use empty alt only for genuinely decorative images.

## Public documentation constraint

Public docs use a dedicated Markdoc repository in `content/docs/*.mdoc`, parsed by `src/lib/markdoc-docs.ts` and rendered by the docs route. Blog files remain exclusively in `content/blog/*.mdoc` and are never loaded by the docs repository.
