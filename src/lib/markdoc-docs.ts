import fs from "node:fs";
import path from "node:path";
import Markdoc, { type Tag } from "@markdoc/markdoc";
import { parse as parseYaml } from "yaml";

export type DocContentType = "reference" | "quickstart" | "guide" | "faq" | "self-hosting";
export type DocHeading = { id: string; title: string; level: 2 | 3 };
export type DocArticle = {
  slug: string;
  title: string;
  description: string;
  section: string;
  order: number;
  content: Tag;
  body: string;
  bodyText: string;
  headings: DocHeading[];
  contentType: DocContentType;
  canonicalUrl: string;
  lastUpdated?: string;
  sdkVersion?: string;
  apiVersion?: string;
  noindex: boolean;
  relatedDocs: string[];
  prerequisites: string[];
};
const directory = path.join(process.cwd(), "content", "docs");
const canonicalOrigin = "https://www.uncoil.dev";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function asString(data: Record<string, unknown>, key: string, filename: string) {
  const value = data[key];
  if (value !== undefined && (typeof value !== "string" || !value)) throw new Error(`${filename}: ${key} must be a non-empty string`);
  return value as string | undefined;
}

function asStringArray(data: Record<string, unknown>, key: string, filename: string) {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) throw new Error(`${filename}: ${key} must be an array of strings`);
  return value as string[];
}

function readArticle(filename: string): DocArticle {
  const source = fs.readFileSync(path.join(directory, filename), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: expected Markdoc frontmatter`);
  const data = parseYaml(match[1]) as Record<string, unknown>;
  for (const field of ["slug", "title", "description", "section"]) if (typeof data[field] !== "string" || !data[field]) throw new Error(`${filename}: missing ${field}`);
  const contentType = data.contentType === undefined ? "reference" : data.contentType;
  if (!["reference", "quickstart", "guide", "faq", "self-hosting"].includes(String(contentType))) throw new Error(`${filename}: invalid contentType`);
  if (data.order !== undefined && (typeof data.order !== "number" || !Number.isFinite(data.order))) throw new Error(`${filename}: order must be a finite number`);
  if (data.noindex !== undefined && typeof data.noindex !== "boolean") throw new Error(`${filename}: noindex must be boolean`);
  const lastUpdated = asString(data, "lastUpdated", filename);
  const sdkVersion = asString(data, "sdkVersion", filename);
  const apiVersion = asString(data, "apiVersion", filename);
  const relatedDocs = asStringArray(data, "relatedDocs", filename);
  const prerequisites = asStringArray(data, "prerequisites", filename);
  const ast = Markdoc.parse(match[2].trim());
  const errors = Markdoc.validate(ast);
  if (errors.length) throw new Error(`${filename}: invalid Markdoc`);
  const content = Markdoc.transform(ast);
  if (!Markdoc.Tag.isTag(content)) throw new Error(`${filename}: invalid document root`);
  const body = match[2].trim();
  const headings: DocHeading[] = [];
  const usedHeadingIds = new Map<string, number>();
  for (const heading of body.matchAll(/^#{2,3}\s+(.+?)\s*#*\s*$/gm)) {
    const title = heading[1].replace(/[`*_]/g, "").trim();
    const level = heading[0].startsWith("###") ? 3 : 2;
    const baseId = slugify(title) || "section";
    const count = (usedHeadingIds.get(baseId) ?? 0) + 1;
    usedHeadingIds.set(baseId, count);
    headings.push({ title, level, id: count === 1 ? baseId : `${baseId}-${count}` });
  }
  const bodyText = body.replace(/```[\s\S]*?```/g, " ").replace(/[`*_>#\[\]{}()]/g, " ").replace(/\s+/g, " ").trim();
  return { slug: data.slug as string, title: data.title as string, description: data.description as string, section: data.section as string, order: typeof data.order === "number" ? data.order : 0, content, body, bodyText, headings, contentType: contentType as DocContentType, canonicalUrl: `${canonicalOrigin}/docs/${data.slug as string}`, lastUpdated, sdkVersion, apiVersion, noindex: data.noindex === true, relatedDocs, prerequisites };
}

let cache: DocArticle[] | undefined;
export function getDocs() {
  if (!cache) {
    const docs = fs.readdirSync(directory).filter((name) => name.endsWith(".mdoc")).map(readArticle).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    const slugs = new Set<string>();
    for (const doc of docs) { if (slugs.has(doc.slug)) throw new Error(`Duplicate documentation slug: ${doc.slug}`); slugs.add(doc.slug); }
    cache = docs;
  }
  return cache;
}
export function getDoc(slug: string) { return getDocs().find((doc) => doc.slug === slug) ?? null; }
export function getPublicDocs() { return getDocs().filter((doc) => !doc.noindex); }
export function getDocMarkdown(slug: string) { const doc = getDoc(slug); return doc && !doc.noindex ? `# ${doc.title}\n\n${doc.description}\n\n${doc.body}` : null; }
export function getDocsMarkdownIndex() { return `# Uncoil Documentation\n\n${getPublicDocs().map((doc) => `- [${doc.title}](${doc.canonicalUrl}.md): ${doc.description}`).join("\n")}\n`; }
