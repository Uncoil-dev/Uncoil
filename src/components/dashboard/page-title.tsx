import type { ElementType, ReactNode } from "react";

/**
 * The one page title used across the dashboard: pixel font with a yellow bar.
 * Styles live in globals.css under `.uncoil-page-title`.
 */
export function PageTitle({
  children,
  as: Tag = "h1",
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return <Tag className={`uncoil-page-title ${className}`.trim()}>{children}</Tag>;
}
