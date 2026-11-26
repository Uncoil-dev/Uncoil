import Link from "next/link";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./pagination";

type Props = { children?: ReactNode; "aria-hidden"?: boolean | "true" | "false" };

function isHidden(node: ReactElement<Props>) {
  const hidden = node.props["aria-hidden"];
  return hidden === true || hidden === "true";
}

function collect(node: ReactNode, match: (el: ReactElement<Props>) => boolean): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap((child) => collect(child, match));
  if (!isValidElement<Props>(node)) return [];
  const own = match(node) ? [node] : [];
  return [...own, ...collect(node.props.children, match)];
}

// Text a screen reader reads: aria-hidden subtrees are skipped.
function accessibleText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(accessibleText).join("");
  if (!isValidElement<Props>(node) || isHidden(node)) return "";
  return accessibleText(node.props.children);
}

function allText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(allText).join("");
  return isValidElement<Props>(node) ? allText(node.props.children) : "";
}

describe("Pagination", () => {
  it("names each link with just its words, keeping the arrows visual only", () => {
    const tree = Pagination({ hasOlder: true, hasNewer: true });
    const links = collect(tree, (el) => el.type === Link);

    expect(links.map((link) => accessibleText(link.props.children).trim())).toEqual(["Older posts", "Newer posts"]);

    const hiddenText = links.map((link) => collect(link.props.children, isHidden).map((el) => allText(el)).join(""));
    expect(hiddenText).toEqual(["←", "→"]);
  });
});
