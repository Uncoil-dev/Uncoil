import fs from "node:fs";
import path from "node:path";

import Markdoc, { type Tag } from "@markdoc/markdoc";
import { parse as parseYaml } from "yaml";

export const blogMarkdocConfig = {
  tags: {
    "trace-scenario": {
      render: "trace-scenario",
      attributes: {
        title: { type: String, required: true },
        prompt: { type: String, required: true },
        outcome: { type: String, required: true },
      },
    },
    "faq-item": {
      render: "faq-item",
      attributes: {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    },
    highlight: {
      render: "highlight",
    },
    "editorial-panel": {
      render: "editorial-panel",
      attributes: {
        eyebrow: { type: String, required: true },
        title: { type: String, required: true },
        body: { type: String, required: true },
        tone: { type: String, default: "yellow", matches: ["yellow", "dark", "paper"] },
      },
    },
    "context-budget-calculator": {
      render: "context-budget-calculator",
      attributes: {
        title: { type: String, required: true },
        contextLimit: { type: Number, required: true },
        systemPromptTokens: { type: Number, required: true },
        toolDefinitionTokens: { type: Number, required: true },
        historyTokens: { type: Number, required: true },
        scratchTokens: { type: Number, required: true },
      },
    },
    "rollout-strategy-picker": {
      render: "rollout-strategy-picker",
      attributes: {
        title: { type: String, required: true },
      },
    },
    "failure-mode-explorer": {
      render: "failure-mode-explorer",
      attributes: {
        title: { type: String, required: true },
        intro: { type: String, required: false },
      },
    },
    "failure-mode-option": {
      render: "failure-mode-option",
      selfClosing: true,
      attributes: {
        label: { type: String, required: true },
        symptom: { type: String, required: true },
        strategy: { type: String, required: true },
        code: { type: String, required: false },
      },
    },
    "topology-picker": {
      render: "topology-picker",
      selfClosing: true,
      attributes: {},
    },
    "release-readiness-checklist": {
      render: "release-readiness-checklist",
      selfClosing: true,
      attributes: {
        title: { type: String, required: true },
      },
    },
    "eval-source-explorer": {
      render: "eval-source-explorer",
      attributes: {
        title: { type: String, required: true },
        intro: { type: String, required: false },
      },
    },
    "tool-permission-matrix": {
      render: "tool-permission-matrix",
      selfClosing: true,
      attributes: {},
    },
    "eval-source-option": {
      render: "eval-source-option",
      selfClosing: true,
      attributes: {
        label: { type: String, required: true },
        extracted: { type: String, required: true },
        redacted: { type: String, required: true },
        category: { type: String, required: false },
      },
    },
    "trace-field-explorer": {
      render: "trace-field-explorer",
      selfClosing: true,
      attributes: {
        title: { type: String, required: true },
        intro: { type: String, required: false },
      },
    },
    "rubric-selector": {
      render: "rubric-selector",
      attributes: {
        title: { type: String, required: true },
        intro: { type: String, required: false },
      },
    },
    "rubric-selector-option": {
      render: "rubric-selector-option",
      selfClosing: true,
      attributes: {
        label: { type: String, required: true },
        layer: { type: String, required: true },
        fixedLogic: { type: String, required: true },
        subjectiveJudgment: { type: String, required: true },
        reason: { type: String, required: true },
      },
    },
    "cost-per-task-calculator": {
      render: "cost-per-task-calculator",
      attributes: {
        title: { type: String, required: true },
        modelCostPerRun: { type: Number, required: true },
        toolCostPerRun: { type: Number, required: true },
        retryRate: { type: Number, required: true },
        successRate: { type: Number, required: true },
      },
    },
    "slo-design-worksheet": {
      render: "slo-design-worksheet",
      selfClosing: true,
      attributes: {
        title: { type: String, required: true },
      },
    },
    "layer-scenario-quiz": {
      render: "layer-scenario-quiz",
      attributes: {
        title: { type: String, required: true },
        intro: { type: String, required: false },
      },
    },
    "layer-scenario": {
      render: "layer-scenario",
      selfClosing: true,
      attributes: {
        scenario: { type: String, required: true },
        answer: { type: String, required: true, matches: ["apm", "ai-observability", "both"] },
        reason: { type: String, required: true },
      },
    },
  },
};

export type BlogImage = {
  src: string;
  alt: string;
  caption?: string;
  card?: string;
  hero?: string;
  og?: string;
};

export type BlogHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  draft: boolean;
  categories: string[];
  tags: string[];
  relatedPosts: string[];
  heroImage?: BlogImage;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    image?: BlogImage;
    canonicalUrl?: string;
  };
  body: string;
  plainText: string;
  headings: BlogHeading[];
  content: Tag;
};

type BlogRepository = {
  getAllPosts(): BlogPost[];
  getPublishedPosts(categories?: string | string[]): BlogPost[];
  getPublishedPost(slug: string): BlogPost | null;
  getCategoryOptions(): Array<{ label: string; value: string }>;
};

const defaultContentDirectory = path.join(process.cwd(), "content", "blog");

function splitFrontmatter(source: string, filename: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: expected YAML frontmatter enclosed by ---`);
  return { frontmatter: parseYaml(match[1]) as unknown, body: match[2].trim() };
}

function requireRecord(value: unknown, filename: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${filename}: frontmatter must be a YAML object`);
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, field: string, filename: string) {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${filename}: frontmatter field “${field}” must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(record: Record<string, unknown>, field: string, filename: string) {
  const value = record[field] ?? [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${filename}: frontmatter field “${field}” must be an array of strings`);
  }
  return value.map((item) => (item as string).trim());
}

function imageValue(value: unknown, field: string, filename: string): BlogImage | undefined {
  if (value === undefined || value === null) return undefined;
  const record = requireRecord(value, filename);
  return {
    src: requireString(record, "src", `${filename} ${field}`),
    alt: requireString(record, "alt", `${filename} ${field}`),
    caption: optionalString(record, "caption"),
    card: optionalString(record, "card"),
    hero: optionalString(record, "hero"),
    og: optionalString(record, "og"),
  };
}

function extractPlainText(ast: ReturnType<typeof Markdoc.parse>) {
  const text: string[] = [];
  for (const node of ast.walk()) {
    if (node.type === "text" && typeof node.attributes.content === "string") {
      text.push(node.attributes.content);
    }
  }
  return text.join(" ").replace(/\s+/g, " ").trim();
}

export function slugifyBlogHeading(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractBlogHeadings(body: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const seen = new Map<string, number>();
  const fence = String.fromCharCode(96).repeat(3);
  let inFence = false;

  for (const line of body.split(/\r?\n/)) {
    if (line.trimStart().startsWith(fence)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = match[2].trim();
    if (!text || /^contents?$/i.test(text)) continue;

    const baseId = slugifyBlogHeading(text) || "section";
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    headings.push({
      level: match[1].length as 2 | 3,
      text,
      id: count ? `${baseId}-${count + 1}` : baseId,
    });
  }

  return headings;
}

export type BlogFaqItem = { question: string; answer: string };

export function extractBlogFaqItems(body: string): BlogFaqItem[] {
  const items: BlogFaqItem[] = [];
  const pattern = /{%\s*faq-item\s+question="([^"]*)"\s+answer="([^"]*)"\s*\/%}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    items.push({ question: match[1], answer: match[2] });
  }
  return items;
}

function parsePost(source: string, filename: string): BlogPost {
  const { frontmatter, body } = splitFrontmatter(source, filename);
  const data = requireRecord(frontmatter, filename);
  const title = requireString(data, "title", filename);
  const slug = requireString(data, "slug", filename);
  const excerpt = requireString(data, "excerpt", filename);
  const publishedAt = requireString(data, "publishedAt", filename);
  const author = requireString(data, "author", filename);
  if (Number.isNaN(Date.parse(publishedAt))) {
    throw new Error(`${filename}: frontmatter field “publishedAt” must be an ISO date`);
  }
  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    throw new Error(`${filename}: frontmatter field “draft” must be a boolean`);
  }

  const ast = Markdoc.parse(body);
  const errors = Markdoc.validate(ast, blogMarkdocConfig);
  if (errors.length) {
    throw new Error(`${filename}: invalid Markdoc: ${errors.map((error) => error.error.message).join("; ")}`);
  }
  const content = Markdoc.transform(ast, blogMarkdocConfig);
  if (!Markdoc.Tag.isTag(content)) {
    throw new Error(`${filename}: expected a Markdoc document root`);
  }

  const seoRecord = data.seo === undefined ? {} : requireRecord(data.seo, filename);
  const heroImage = imageValue(data.heroImage, "heroImage", filename);

  return {
    id: path.basename(filename, path.extname(filename)),
    title,
    slug,
    excerpt,
    publishedAt: new Date(publishedAt).toISOString(),
    updatedAt: optionalString(data, "updatedAt"),
    author,
    draft: data.draft === true,
    categories: stringArray(data, "categories", filename),
    tags: stringArray(data, "tags", filename),
    relatedPosts: stringArray(data, "relatedPosts", filename),
    heroImage,
    seo: {
      metaTitle: optionalString(seoRecord, "metaTitle"),
      metaDescription: optionalString(seoRecord, "metaDescription"),
      image: imageValue(seoRecord.image, "seo.image", filename) ?? heroImage,
      canonicalUrl: optionalString(seoRecord, "canonicalUrl"),
    },
    body,
    plainText: extractPlainText(ast),
    headings: extractBlogHeadings(body),
    content,
  };
}

export function createBlogRepository(contentDirectory = defaultContentDirectory): BlogRepository {
  let posts: BlogPost[] | undefined;

  function getAllPosts() {
    if (posts) return posts;
    if (!fs.existsSync(contentDirectory)) return [];
    posts = fs
      .readdirSync(contentDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdoc"))
      .map((entry) => {
        const filename = path.join(contentDirectory, entry.name);
        return parsePost(fs.readFileSync(filename, "utf8"), entry.name);
      });

    const seen = new Set<string>();
    for (const post of posts) {
      if (seen.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
      seen.add(post.slug);
    }
    return posts;
  }

  function getPublishedPosts(categories?: string | string[]) {
    const selected = categories === undefined ? [] : Array.isArray(categories) ? categories : [categories];
    return getAllPosts()
      .filter(
        (post) =>
          !post.draft && (selected.length === 0 || selected.some((category) => post.categories.includes(category)))
      )
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
  }

  return {
    getAllPosts,
    getPublishedPosts,
    getPublishedPost(slug) {
      return getPublishedPosts().find((post) => post.slug === slug) ?? null;
    },
    getCategoryOptions() {
      return [...new Set(getPublishedPosts().flatMap((post) => post.categories))]
        .sort((left, right) => left.localeCompare(right))
        .map((category) => ({ label: category, value: category }));
    },
  };
}

const repository = createBlogRepository();

export const getAllPosts = repository.getAllPosts;
export const getPublishedPosts = repository.getPublishedPosts;
export const getPublishedPost = repository.getPublishedPost;
export const getCategoryOptions = repository.getCategoryOptions;
export function getPostDate(post: BlogPost) {
  return post.updatedAt ?? post.publishedAt;
}
