import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "../../../..");
const APPROVED_INTERACTIONS = ["trace-scenario"];
const NOTE_LABELS = [
  "Field note",
  "Decision rule",
  "Operating note",
  "Release rule",
  "Security note",
  "Note",
  "Warning",
  "Caution",
];

function splitDocument(source, filePath) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) {
    throw new Error(`${filePath} does not contain valid YAML frontmatter.`);
  }

  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2],
  };
}

function resolvePostPath(input, repositoryRoot) {
  if (!input) {
    throw new Error("Provide a blog slug or .mdoc path. Example: npm run validate:blog -- ai-evaluation-metrics");
  }

  if (!input.endsWith(".mdoc")) {
    return path.join(repositoryRoot, "content", "blog", `${input}.mdoc`);
  }

  if (path.isAbsolute(input)) {
    return input;
  }

  const fromWorkingDirectory = path.resolve(process.cwd(), input);
  if (fs.existsSync(fromWorkingDirectory)) {
    return fromWorkingDirectory;
  }

  return path.resolve(repositoryRoot, input);
}

function addIssue(issues, code, message) {
  issues.push({ code, message });
}

function countWords(body) {
  return body.match(/\b[A-Za-z0-9][A-Za-z0-9’'-]*\b/g)?.length ?? 0;
}

function meaningfulAlt(alt) {
  const normalized = String(alt ?? "").trim();
  return normalized.length >= 18 && !/^(image|diagram|photo|screenshot|hero image)$/i.test(normalized);
}

function mediaFilePath(repositoryRoot, mediaPath) {
  return path.join(repositoryRoot, "public", ...mediaPath.replace(/^\//, "").split("/"));
}

function collectRegexPositions(body, regex) {
  const positions = [];
  for (const match of body.matchAll(regex)) {
    positions.push({ index: match.index ?? 0, match });
  }
  return positions;
}

function normalizeSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function findMediaReuse(repositoryRoot, currentPath, mediaSource) {
  const blogDirectory = path.join(repositoryRoot, "content", "blog");
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  const reusedBy = [];
  for (const entry of fs.readdirSync(blogDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".mdoc")) {
      continue;
    }

    const candidatePath = path.join(blogDirectory, entry.name);
    if (path.resolve(candidatePath) === path.resolve(currentPath)) {
      continue;
    }

    try {
      const candidate = splitDocument(fs.readFileSync(candidatePath, "utf8"), candidatePath);
      const candidateHero = candidate.frontmatter.heroImage;
      const candidateSources = new Set(
        typeof candidateHero === "string"
          ? [candidateHero]
          : Object.values(candidateHero ?? {}).filter((value) => typeof value === "string" && value.startsWith("/media/")),
      );
      for (const match of candidate.body.matchAll(/!\[[^\]]*\]\((\/media\/[^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        candidateSources.add(match[1]);
      }

      if (candidateSources.has(mediaSource)) {
        reusedBy.push(candidate.frontmatter.slug ?? entry.name);
      }
    } catch {
      // The repository-wide content contract reports malformed neighboring files.
    }
  }

  return reusedBy;
}

export function validateBlogPost(input, options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? DEFAULT_REPOSITORY_ROOT);
  const filePath = resolvePostPath(input, repositoryRoot);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Blog post not found: ${filePath}`);
  }

  const { frontmatter, body } = splitDocument(fs.readFileSync(filePath, "utf8"), filePath);
  const issues = [];
  const slug = String(frontmatter.slug ?? path.basename(filePath, ".mdoc"));
  const midpoint = body.length / 2;
  const finalThirtyPercent = body.length * 0.7;
  const words = countWords(body);

  for (const field of ["title", "slug", "excerpt", "publishedAt", "author"]) {
    if (!frontmatter[field]) {
      addIssue(issues, `frontmatter-${field}`, `Frontmatter must define ${field}.`);
    }
  }

  if (words < 3000 || words > 10000) {
    addIssue(issues, "word-count", `Body contains ${words.toLocaleString()} words; required range is 3,000–10,000.`);
  }

  const hero = typeof frontmatter.heroImage === "string"
    ? { src: frontmatter.heroImage, alt: "" }
    : (frontmatter.heroImage ?? {});
  if (!hero.src || !String(hero.src).startsWith("/media/")) {
    addIssue(issues, "hero-source", "heroImage.src must reference an article-specific file under /media/.");
  } else {
    const heroBase = normalizeSlug(path.basename(hero.src, path.extname(hero.src)));
    if (!heroBase.includes(normalizeSlug(slug))) {
      addIssue(issues, "hero-filename", `Hero filename must contain the article slug (${slug}).`);
    }
    if (!fs.existsSync(mediaFilePath(repositoryRoot, hero.src))) {
      addIssue(issues, "hero-missing", `Hero file does not exist: ${hero.src}`);
    }
    const reusedBy = findMediaReuse(repositoryRoot, filePath, hero.src);
    if (reusedBy.length > 0) {
      addIssue(issues, "hero-not-unique", `Hero is also referenced by: ${reusedBy.join(", ")}.`);
    }
  }
  if (!meaningfulAlt(hero.alt)) {
    addIssue(issues, "hero-alt", "heroImage.alt must meaningfully describe the article-specific visual.");
  }

  const imageMatches = collectRegexPositions(body, /!\[([^\]]*)\]\((\/media\/[^)\s]+)(?:\s+"[^"]*")?\)/g);
  const bodyImagePaths = [...new Set(imageMatches.map(({ match }) => match[2]))];
  if (bodyImagePaths.length < 2) {
    addIssue(issues, "body-images", `Found ${bodyImagePaths.length} distinct in-body media image(s); at least 2 are required.`);
  }
  if (!imageMatches.some(({ index }) => index >= midpoint)) {
    addIssue(issues, "lower-half-image", "Place at least one instructional image after the article midpoint.");
  }
  for (const { match } of imageMatches) {
    const [, alt, mediaPath] = match;
    if (!meaningfulAlt(alt)) {
      addIssue(issues, "image-alt", `Image ${mediaPath} needs meaningful alt text.`);
    }
    if (mediaPath === hero.src) {
      addIssue(issues, "hero-reused-in-body", `Do not reuse the hero as an instructional body image: ${mediaPath}.`);
    }
    if (!fs.existsSync(mediaFilePath(repositoryRoot, mediaPath))) {
      addIssue(issues, "image-missing", `Body image file does not exist: ${mediaPath}`);
    }
  }
  for (const mediaPath of bodyImagePaths) {
    const reusedBy = findMediaReuse(repositoryRoot, filePath, mediaPath);
    if (reusedBy.length > 0) {
      addIssue(issues, "body-image-not-unique", `Body image ${mediaPath} is also referenced by: ${reusedBy.join(", ")}.`);
    }
  }

  const h2Matches = collectRegexPositions(body, /^##\s+(.+)$/gm);
  const h3Count = body.match(/^###\s+.+$/gm)?.length ?? 0;
  if (h2Matches.length < 8) {
    addIssue(issues, "h2-depth", `Found ${h2Matches.length} H2 chapters; use at least 8 meaningful chapters for long-form navigation.`);
  }
  if (h3Count < 3) {
    addIssue(issues, "h3-depth", `Found ${h3Count} H3 subsections; use at least 3 where they improve navigation.`);
  }

  const highlightMatches = collectRegexPositions(body, /\{%\s*highlight\s*%\}/g);
  if (highlightMatches.length < 6 || highlightMatches.length > 14) {
    addIssue(issues, "highlight-count", `Found ${highlightMatches.length} highlights; keep 6–14 purposeful highlights across the article.`);
  }
  if (highlightMatches.filter(({ index }) => index >= midpoint).length < 2) {
    addIssue(issues, "lower-half-highlights", "Use at least two purposeful highlights after the article midpoint.");
  }

  const panelMatches = collectRegexPositions(body, /\{%\s*editorial-panel\b([^%]*?)\/%\}/g);
  const panelTones = new Set(
    panelMatches
      .map(({ match }) => /\btone="([^"]+)"/.exec(match[1])?.[1])
      .filter(Boolean),
  );
  if (panelMatches.length < 2) {
    addIssue(issues, "editorial-panels", `Found ${panelMatches.length} editorial panel(s); at least 2 teaching panels are required.`);
  }
  if (panelTones.size < 2) {
    addIssue(issues, "panel-variety", "Use at least two distinct editorial-panel tones to create meaningful visual contrast.");
  }
  if (!panelMatches.some(({ index }) => index >= midpoint)) {
    addIssue(issues, "lower-half-panel", "Place at least one teaching editorial panel after the article midpoint.");
  }

  const tableCount = body.match(/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/gm)?.length ?? 0;
  if (tableCount < 2) {
    addIssue(issues, "tables", `Found ${tableCount} Markdown table(s); at least 2 semantic comparison or decision tables are required.`);
  }

  const fenceCount = body.match(/^```[^\r\n]*$/gm)?.length ?? 0;
  if (fenceCount < 2 || fenceCount % 2 !== 0) {
    addIssue(issues, "code-example", "Include at least one complete fenced code example.");
  }

  const noteLabelPattern = NOTE_LABELS.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const noteCount = body.match(new RegExp(`^>\\s+\\*\\*(?:${noteLabelPattern}):\\*\\*`, "gmi"))?.length ?? 0;
  if (noteCount < 2) {
    addIssue(issues, "notes", `Found ${noteCount} labeled note(s); at least 2 decision, field, security, or operating notes are required.`);
  }

  const interactionCount = APPROVED_INTERACTIONS.reduce((total, tag) => {
    const matches = body.match(new RegExp(`\\{%\\s*${tag}\\b`, "g"))?.length ?? 0;
    return total + matches;
  }, 0);
  if (interactionCount !== 1) {
    addIssue(issues, "interaction", `Found ${interactionCount} approved interaction(s); use exactly one purposeful deterministic interaction.`);
  }

  const internalLinks = [...body.matchAll(/\[[^\]]+\]\(\/blog\/([^)#?\s]+)(?:#[^)\s]+)?\)/g)]
    .map((match) => match[1])
    .filter((targetSlug) => targetSlug !== slug);
  const distinctInternalLinks = new Set(internalLinks);
  if (distinctInternalLinks.size < 2) {
    addIssue(issues, "internal-links", `Found ${distinctInternalLinks.size} distinct contextual blog link(s); at least 2 are required.`);
  }

  const faqHeadings = h2Matches.filter(({ match }) => /^(frequently asked questions|faq)$/i.test(match[1].trim()));
  const faqItemCount = body.match(/\{%\s*faq-item\b/g)?.length ?? 0;
  if (faqHeadings.length !== 1) {
    addIssue(issues, "faq-section", `Found ${faqHeadings.length} FAQ headings; use exactly one FAQ section.`);
  } else if (faqHeadings[0].index < finalThirtyPercent) {
    addIssue(issues, "faq-position", "Place the FAQ after the main teaching, within the final 30% of the body.");
  }
  if (faqItemCount !== 5) {
    addIssue(issues, "faq-items", `Found ${faqItemCount} FAQ items; exactly 5 article-specific questions are required.`);
  }

  const actionHeading = h2Matches.find(({ index, match }) => (
    index >= finalThirtyPercent
    && /(checklist|next move|next step|action|takeaway|release decision|operating plan)/i.test(match[1])
    && !/faq|frequently asked/i.test(match[1])
  ));
  if (!actionHeading) {
    addIssue(issues, "action-ending", "Add a practical checklist, next move, action, or release decision in the final 30% before the FAQ.");
  }

  if (/^##\s+Recommended next reads\s*$/gmi.test(body)) {
    addIssue(issues, "recommended-reads", "Remove the in-body “Recommended next reads” section; shared related posts render after the article.");
  }

  return {
    filePath,
    slug,
    issues,
    metrics: {
      words,
      h2: h2Matches.length,
      h3: h3Count,
      bodyImages: bodyImagePaths.length,
      lowerHalfImages: imageMatches.filter(({ index }) => index >= midpoint).length,
      highlights: highlightMatches.length,
      lowerHalfHighlights: highlightMatches.filter(({ index }) => index >= midpoint).length,
      editorialPanels: panelMatches.length,
      panelTones: panelTones.size,
      tables: tableCount,
      notes: noteCount,
      interactions: interactionCount,
      internalLinks: distinctInternalLinks.size,
      faqItems: faqItemCount,
    },
  };
}

function printResult(result) {
  const summary = Object.entries(result.metrics)
    .map(([key, value]) => `${key}=${value}`)
    .join(" | ");

  if (result.issues.length === 0) {
    console.log(`PASS ${result.slug}`);
    console.log(summary);
    return;
  }

  console.error(`FAIL ${result.slug} (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"})`);
  for (const issue of result.issues) {
    console.error(`- [${issue.code}] ${issue.message}`);
  }
  console.error(summary);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  try {
    const result = validateBlogPost(process.argv[2]);
    printResult(result);
    process.exitCode = result.issues.length === 0 ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
