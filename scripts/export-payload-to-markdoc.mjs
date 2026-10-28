import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";
import { stringify as stringifyYaml } from "yaml";

import { lexicalToMarkdoc } from "./lib/lexical-to-markdoc.mjs";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const databaseArgument = process.argv.find((argument) =>
  argument.startsWith("--database="),
);
const databasePath = path.resolve(
  databaseArgument?.slice("--database=".length) || "payload-local.db",
);
const contentDirectory = path.resolve("content", "blog");
const client = createClient({ url: pathToFileURL(databasePath).href });

function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([, child]) => child !== undefined && child !== null && child !== "",
      )
      .map(([key, child]) => [key, compact(child)]),
  );
}

function mediaImage(media) {
  if (!media) return undefined;
  const publicPath = (filename) =>
    filename ? `/media/${filename}` : undefined;
  return compact({
    src: publicPath(media.filename),
    alt: media.alt,
    caption: media.caption,
    card: publicPath(media.sizes_card_filename),
    hero: publicPath(media.sizes_hero_filename),
    og: publicPath(media.sizes_og_filename),
  });
}

const [postResult, categoryResult, mediaResult, relationResult, tagResult] =
  await Promise.all([
    client.execute("SELECT * FROM posts ORDER BY id"),
    client.execute("SELECT * FROM categories ORDER BY id"),
    client.execute("SELECT * FROM media ORDER BY id"),
    client.execute('SELECT * FROM posts_rels ORDER BY parent_id, "order"'),
    client.execute("SELECT * FROM posts_tags ORDER BY _parent_id, _order"),
  ]);

const posts = postResult.rows;
const categories = new Map(
  categoryResult.rows.map((category) => [Number(category.id), category]),
);
const media = new Map(mediaResult.rows.map((item) => [Number(item.id), item]));
const postsById = new Map(posts.map((post) => [Number(post.id), post]));

const relationsByPost = new Map();
for (const relation of relationResult.rows) {
  const values = relationsByPost.get(Number(relation.parent_id)) ?? {
    categories: [],
    relatedPosts: [],
  };
  if (relation.path === "categories" && relation.categories_id) {
    const category = categories.get(Number(relation.categories_id));
    if (category?.slug) values.categories.push(String(category.slug));
  }
  if (relation.path === "relatedPosts" && relation.posts_id) {
    const related = postsById.get(Number(relation.posts_id));
    if (related?.slug) values.relatedPosts.push(String(related.slug));
  }
  relationsByPost.set(Number(relation.parent_id), values);
}

const tagsByPost = new Map();
for (const tag of tagResult.rows) {
  const tags = tagsByPost.get(Number(tag._parent_id)) ?? [];
  if (tag.tag) tags.push(String(tag.tag));
  tagsByPost.set(Number(tag._parent_id), tags);
}

const output = posts.map((post) => {
  const id = Number(post.id);
  const heroImage = mediaImage(media.get(Number(post.hero_image_id)));
  const seoImage =
    mediaImage(media.get(Number(post.seo_image_id))) ?? heroImage;
  const relations = relationsByPost.get(id) ?? {
    categories: [],
    relatedPosts: [],
  };
  const publishedAt = String(post.published_at || post.created_at);
  const frontmatter = compact({
    title: String(post.title),
    slug: String(post.slug),
    excerpt: String(post.excerpt),
    publishedAt,
    updatedAt: String(post.updated_at),
    author: String(post.author || "Uncoil Team"),
    draft: post._status !== "published",
    categories: relations.categories,
    tags: tagsByPost.get(id) ?? [],
    relatedPosts: relations.relatedPosts,
    heroImage,
    seo: {
      metaTitle: post.seo_meta_title,
      metaDescription: post.seo_meta_description,
      image: seoImage,
      canonicalUrl: post.seo_canonical_url,
    },
  });
  const lexical =
    typeof post.content === "string" ? JSON.parse(post.content) : post.content;
  const body = lexicalToMarkdoc(
    lexical,
    (mediaId) => mediaImage(media.get(Number(mediaId))) ?? null,
  );
  const source = `---\n${stringifyYaml(frontmatter, { lineWidth: 0 }).trim()}\n---\n\n${body}\n`;
  return { filename: `${post.slug}.mdoc`, source, draft: frontmatter.draft };
});

if (write) {
  fs.mkdirSync(contentDirectory, { recursive: true });
  for (const item of output)
    fs.writeFileSync(
      path.join(contentDirectory, item.filename),
      item.source,
      "utf8",
    );
}

const draftCount = output.filter((item) => item.draft).length;
console.log(
  `${write ? "Exported" : "Would export"} ${output.length} posts (${draftCount} drafts) to ${contentDirectory}.`,
);
if (!write) console.log("Run again with --write to create the Markdoc files.");

await client.close();
