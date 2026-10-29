import { SERIES_MANIFEST } from "./organic-series-manifest.ts";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const errors = [];
const max = { excerpt: 220, metaTitle: 70, metaDescription: 180 };
const mediaRegistryPath = "scripts/content/media-sources.json";
const mediaDirectory = "public/media/organic-series/";
const mediaDirectoryPath = resolve(mediaDirectory);
let mediaSources = [];
const articleFiles = {
  "ai-agent-observability-complete-guide": "ai-agent-observability.ts",
  "llm-observability-metrics-that-matter": "llm-observability-metrics.ts",
  "debug-ai-agents-in-production": "debug-ai-agents-production.ts",
  "ai-agent-evaluation-practical-guide": "ai-agent-evaluation-guide.ts",
  "reduce-llm-costs-without-hurting-quality": "reduce-llm-costs.ts",
  "llm-tracing-explained": "llm-tracing-explained.ts",
  "ai-agent-reliability-failures-retries-guardrails": "ai-agent-reliability.ts",
  "prompt-versioning-and-prompt-management": "prompt-versioning-management.ts",
  "ai-agent-testing-unit-tests-production-evals": "ai-agent-testing.ts",
  "building-production-ready-ai-agents": "production-ready-ai-agents.ts",
};

try {
  mediaSources = JSON.parse(readFileSync(mediaRegistryPath, "utf8"));
  if (!Array.isArray(mediaSources)) errors.push("Media registry must be an array.");
} catch {
  errors.push(`Media registry is required at ${mediaRegistryPath}.`);
}

if (SERIES_MANIFEST.length !== 10) errors.push(`Expected exactly 10 entries, found ${SERIES_MANIFEST.length}.`);

const slugs = new Set();
for (const entry of SERIES_MANIFEST) {
  if (!entry.slug || slugs.has(entry.slug)) errors.push(`Slug must be unique: ${entry.slug || "(missing)"}.`);
  slugs.add(entry.slug);
  if (entry.relatedSlugs.length < 2) errors.push(`${entry.slug}: at least two related slugs are required.`);
  if (!entry.primaryKeyword?.trim()) errors.push(`${entry.slug}: primary keyword is required.`);
  if (!entry.unsplash?.sourceUrl?.trim() || !entry.unsplash?.description?.trim()) errors.push(`${entry.slug}: Unsplash source data is required.`);
  if (!entry.uncoilLink?.startsWith("/docs/") && !entry.uncoilLink?.startsWith("/product/")) errors.push(`${entry.slug}: an Uncoil /docs/ or /product/ link is required.`);
  for (const [field, limit] of Object.entries(max)) {
    const value = field === "excerpt" ? entry.excerpt : entry.seo[field];
    if (!value?.trim()) errors.push(`${entry.slug}: ${field} is required.`);
    else if (value.length > limit) errors.push(`${entry.slug}: ${field} exceeds ${limit} characters.`);
  }
}

const collectText = (node) => {
  if (!node || typeof node !== "object") return [];
  const ownText = typeof node.text === "string" ? [node.text] : [];
  const children = Array.isArray(node.children) ? node.children.flatMap(collectText) : [];
  return [...ownText, ...children];
};

const allNodes = (node) => {
  if (!node || typeof node !== "object") return [];
  const children = Array.isArray(node.children) ? node.children.flatMap(allNodes) : [];
  return [node, ...children];
};

const hasHeading = (nodes, value) => nodes.some((node) => node.type === "heading" && collectText(node).join(" ").toLowerCase().includes(value));

const mediaIdBySlug = Object.fromEntries(SERIES_MANIFEST.map((entry, index) => [entry.slug, index + 1]));
const reports = [];
for (const entry of SERIES_MANIFEST) {
  const articleFile = articleFiles[entry.slug];
  const articlePath = resolve("scripts/content/articles", articleFile ?? "");
  if (!articleFile || !existsSync(articlePath)) {
    errors.push(`${entry.slug}: article module is required at scripts/content/articles/${articleFile ?? "(missing)"}.`);
    continue;
  }

  try {
    const articleModule = await import(pathToFileURL(articlePath).href);
    if (typeof articleModule.buildArticle !== "function") {
      errors.push(`${entry.slug}: article module must export buildArticle(mediaIdBySlug).`);
      continue;
    }
    const document = articleModule.buildArticle(mediaIdBySlug);
    const nodes = allNodes(document?.root);
    const text = collectText(document?.root).join(" ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").filter(Boolean).length : 0;
    const headings = nodes.filter((node) => node.type === "heading");
    const links = nodes.filter((node) => node.type === "link").map((node) => node.fields?.url).filter((url) => typeof url === "string");
    const blogLinks = links.filter((url) => url.startsWith("/blog/"));
    const uncoilLinks = links.filter((url) => url.startsWith("/docs/") || url.startsWith("/product/"));
    const uploads = nodes.filter((node) => node.type === "upload");

    if (!document?.root || document.root.type !== "root") errors.push(`${entry.slug}: buildArticle must return a Lexical root document.`);
    if (words < 5000 || words > 10000) errors.push(`${entry.slug}: expected 5,000–10,000 words, found ${words}.`);
    if (headings.length < 8) errors.push(`${entry.slug}: expected at least eight headings, found ${headings.length}.`);
    if (!hasHeading(nodes, "introduction")) errors.push(`${entry.slug}: introduction heading is required.`);
    if (!hasHeading(nodes, "contents")) errors.push(`${entry.slug}: contents heading is required.`);
    if (!hasHeading(nodes, "framework")) errors.push(`${entry.slug}: practical framework heading is required.`);
    if (!hasHeading(nodes, "example")) errors.push(`${entry.slug}: grounded example heading is required.`);
    if (!hasHeading(nodes, "checklist")) errors.push(`${entry.slug}: operational checklist heading is required.`);
    if (!hasHeading(nodes, "frequently asked questions")) errors.push(`${entry.slug}: FAQ heading is required.`);
    if (!hasHeading(nodes, "visual guide")) errors.push(`${entry.slug}: visual guide heading is required.`);
    if (!hasHeading(nodes, "next step")) errors.push(`${entry.slug}: required final CTA heading is missing.`);
    if (!uploads.some((node) => node.relationTo === "media" && node.value === mediaIdBySlug[entry.slug])) errors.push(`${entry.slug}: hero-media upload node is required.`);
    if (blogLinks.length < 2) errors.push(`${entry.slug}: at least two /blog/ links are required.`);
    if (uncoilLinks.length < 1) errors.push(`${entry.slug}: at least one /docs/ or /product/ link is required.`);
    if (text.indexOf("Next step:") < text.lastIndexOf("Frequently asked questions")) errors.push(`${entry.slug}: final CTA must follow the FAQ.`);
    reports.push({ slug: entry.slug, headings: headings.length, words, blogLinks: blogLinks.length, uncoilLinks: uncoilLinks.length });
  } catch (error) {
    errors.push(`${entry.slug}: could not load or validate article module (${error instanceof Error ? error.message : String(error)}).`);
  }
}

const mediaBySlug = new Map();
const sourceUrls = new Set();
const downloadUrls = new Set();
const localPaths = new Set();
for (const media of mediaSources) {
  if (!media?.slug?.trim()) {
    errors.push("Media entry slug is required.");
    continue;
  }
  if (mediaBySlug.has(media.slug)) errors.push(`Duplicate media entry slug: ${media.slug}.`);
  mediaBySlug.set(media.slug, media);
  if (!/^https:\/\/unsplash\.com\/photos\/.+-[A-Za-z0-9_-]+$/.test(media.sourceUrl ?? "")) errors.push(`${media.slug}: sourceUrl must be a specific Unsplash photo URL.`);
  if (!/^https:\/\/images\.unsplash\.com\/.+/.test(media.downloadUrl ?? "")) errors.push(`${media.slug}: downloadUrl must be a direct Unsplash image URL.`);
  if ((media.altText?.trim().length ?? 0) < 12) errors.push(`${media.slug}: altText must be at least 12 characters.`);
  const localPath = media.localPath ? resolve(media.localPath) : null;
  if (!localPath || relative(mediaDirectoryPath, localPath).startsWith("..")) errors.push(`${media.slug}: localPath must be within ${mediaDirectory}.`);
  else if (!existsSync(localPath)) errors.push(`${media.slug}: local image is missing at ${media.localPath}.`);
  for (const [value, label, set] of [[media.sourceUrl, "sourceUrl", sourceUrls], [media.downloadUrl, "downloadUrl", downloadUrls], [media.localPath, "localPath", localPaths]]) {
    if (!value?.trim()) continue;
    if (set.has(value)) errors.push(`${media.slug}: ${label} must be unique.`);
    set.add(value);
  }
}

if (mediaSources.length !== SERIES_MANIFEST.length) errors.push(`Expected ${SERIES_MANIFEST.length} media entries, found ${mediaSources.length}.`);
for (const entry of SERIES_MANIFEST) {
  const media = mediaBySlug.get(entry.slug);
  if (!media) errors.push(`${entry.slug}: media registry entry is required.`);
  else if (entry.unsplash.sourceUrl !== media.sourceUrl) errors.push(`${entry.slug}: manifest sourceUrl must match the media registry.`);
}

if (errors.length) {
  console.error("Organic-series manifest validation failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`Organic-series content validation passed for ${SERIES_MANIFEST.length} entries.`);
for (const report of reports) console.log(`${report.slug}: ${report.words} words, ${report.headings} headings, ${report.blogLinks} blog links, ${report.uncoilLinks} Uncoil links.`);
