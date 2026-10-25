import Markdoc from "@markdoc/markdoc";
import React from "react";
import { BlogCodeBlock } from "@/components/blog/blog-code-block";
import type { DocArticle } from "@/lib/markdoc-docs";

const components = { pre: BlogCodeBlock };
const Hidden = () => null;

export function MarkdocDoc({ content }: Pick<DocArticle, "content">) {
  return (
    <div className="docs-markdoc">
      {Markdoc.renderers.react(content, React, {
        components,
        // The page header already renders the one H1, so the body's own "# Title" must not become a second one.
        resolveTagName: (name, map) => (name === "h1" ? Hidden : typeof map === "function" ? map(name) : map[name] ?? name),
      })}
    </div>
  );
}
