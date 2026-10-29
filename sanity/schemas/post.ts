import { defineType, defineField } from "sanity";

export const post = defineType({
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      initialValue: "Uncoil Team",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      description: "Short description for SEO and previews (150-160 chars ideal)",
      rows: 3,
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Required for accessibility and SEO",
        }),
      ],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          description: "Override the browser tab title (defaults to post title)",
        }),
        defineField({
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          description: "Override the SEO meta description (defaults to excerpt)",
          rows: 3,
        }),
        defineField({
          name: "ogImage",
          title: "Open Graph Image",
          type: "image",
          description: "Custom OG image for social sharing (1200x630 recommended)",
          options: { hotspot: true },
        }),
        defineField({
          name: "canonicalUrl",
          title: "Canonical URL",
          type: "url",
          description: "Custom canonical URL if republished elsewhere",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "excerpt",
      media: "coverImage",
    },
  },
  orderings: [
    {
      title: "Published Date",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
