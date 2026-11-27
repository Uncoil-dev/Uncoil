// Which design the site root renders. The previous homepage stays in the codebase and stays
// viewable at CLASSIC_HOME_PATH (unlisted and noindex), so going back is this one constant.

export type HomeDesign = "current" | "classic";

export const HOME_DESIGN = "current" as HomeDesign;

export const CLASSIC_HOME_PATH = "/classic";

/**
 * The classic homepage is drawn under a see-through nav that turns solid on scroll, so it gets no
 * spacer above it. Every other marketing page, the current homepage included, sits under the
 * solid nav with a spacer.
 */
export function usesOverlayNav(pathname: string, design: HomeDesign = HOME_DESIGN) {
  return pathname === CLASSIC_HOME_PATH || (pathname === "/" && design === "classic");
}
