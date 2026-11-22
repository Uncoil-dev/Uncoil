#!/usr/bin/env node
// Scans repository content for broken internal links, missing descriptions and
// missing image alt text. Prints findings; with --open-issues it files
// de-duplicated GitHub issues (needs GITHUB_TOKEN and the gh CLI).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PREFIX = "[content-scan]";
export const LABEL = "agent-task-queued";
export const MAX_NEW = 5;

export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: text.slice(m[0].length), raw: m[1] };
}

export function extractLinks(body) {
  const out = [];
  const re = /(?<!!)\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
  for (let m; (m = re.exec(body)); ) out.push(m[1]);
  return out;
}

export function findMissingAlt(text) {
  const out = [];
  for (const m of text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) if (!m[1].trim()) out.push(m[2]);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const src = /^\s*(?:-\s*)?(?:src|image|url):\s*["']?(\/media\/[^"'\s]+)/.exec(line);
    if (src && !/^\s*(?:-\s*)?alt:\s*\S/m.test(lines.slice(i - 2 < 0 ? 0 : i - 2, i + 3).join("\n"))) out.push(src[1]);
  });
  return out;
}

export function isInternal(href) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function normalizeHref(href) {
  return href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
}

export function stableKey(kind, file, detail = "") {
  return `${kind}:${file}${detail ? `:${detail}` : ""}`;
}

function listFiles(dir, exts) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

export function scan(root) {
  const blog = listFiles(join(root, "content/blog"), [".mdoc"]);
  const docs = listFiles(join(root, "content/docs"), [".mdoc", ".md"]);
  const slugs = { "/blog": true, "/docs": true };
  const meta = [];
  for (const [files, base, field] of [[blog, "/blog", "excerpt"], [docs, "/docs", "description"]]) {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      const { data, body } = parseFrontmatter(text);
      const rel = f.slice(root.length + 1);
      if (data.slug) slugs[`${base}/${data.slug}`] = true;
      meta.push({ rel, text, data, body, field });
    }
  }
  const findings = [];
  for (const { rel, text, data, body, field } of meta) {
    if (!data[field] && !data.seoDescription && !/^\s+description:\s*\S/m.test(text)) {
      findings.push({ key: stableKey("meta", rel), problem: `Missing ${field}`, file: rel });
    }
    for (const src of findMissingAlt(text)) findings.push({ key: stableKey("alt", rel, src), problem: `Image without alt text: ${src}`, file: rel });
    for (const href of extractLinks(body).filter(isInternal)) {
      const p = normalizeHref(href);
      const known = slugs[p] || existsSync(join(root, "public", p)) || !/^\/(blog|docs)\//.test(p);
      if (!known) findings.push({ key: stableKey("link", rel, p), problem: `Broken internal link: ${p}`, file: rel });
    }
  }
  const llms = join(root, "public/llms.txt");
  if (existsSync(llms)) {
    for (const m of readFileSync(llms, "utf8").matchAll(/\]\(https:\/\/www\.uncoil\.dev(\/(?:blog|docs)\/[^)\s#?]+)\)/g)) {
      const p = normalizeHref(m[1]);
      if (/\.xml$/.test(p)) continue; // feed routes, not content pages
      if (!slugs[p] && (blog.length || docs.length)) findings.push({ key: stableKey("llms", "public/llms.txt", p), problem: `llms.txt links to unknown page: ${p}`, file: "public/llms.txt" });
    }
  }
  return findings;
}

export function issueFor(f) {
  return {
    title: `${PREFIX} ${f.key}`,
    body: `**Task**\n${f.problem}. Fix it so the content check passes.\n\n**Files owned**\n- ${f.file}\n\n**Done looks like**\n- The problem above no longer appears when running \`node scripts/scan-content.mjs\`.\n- Content checks pass.\n`,
  };
}

export function selectNew(findings, openTitles, max = MAX_NEW) {
  const seen = new Set(openTitles);
  return findings.map(issueFor).filter((i) => !seen.has(i.title)).slice(0, max);
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function main() {
  const root = process.cwd();
  const findings = scan(root);
  console.log(`${findings.length} finding(s)`);
  for (const f of findings) console.log(`- ${f.key}: ${f.problem}`);
  if (!process.argv.includes("--open-issues")) return;
  const open = JSON.parse(gh(["issue", "list", "--state", "open", "--label", LABEL, "--limit", "500", "--json", "title"])).map((i) => i.title);
  const fresh = selectNew(findings, open);
  if (fresh.length) {
    try { gh(["label", "create", LABEL, "--color", "ededed", "--description", "Queued agent task"]); } catch { /* exists */ }
  }
  for (const i of fresh) console.log(gh(["issue", "create", "--title", i.title, "--body", i.body, "--label", LABEL]).trim());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
