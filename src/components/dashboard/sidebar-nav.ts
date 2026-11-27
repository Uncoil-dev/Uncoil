export type SidebarLeaf = { title: string; href: string; external?: boolean; badge?: "New" };

/** Links under Observe. Costs needs a real project or the demo; the playground has no costs page. */
export function observeLeaves({
  liveProject,
  demo,
  synthetic,
  showSessions,
  href,
}: {
  liveProject: boolean;
  demo: boolean;
  synthetic: boolean;
  showSessions: boolean;
  href: (view: string) => string;
}): SidebarLeaf[] {
  return [
    { title: "Tracing", href: href("tracing") },
    ...(liveProject ? [{ title: "Steps", href: href("steps") }] : []),
    ...(liveProject || demo ? [{ title: "Costs", href: href("costs") }] : []),
    ...(synthetic || demo ? [{ title: "Explore", href: href("explore") }] : []),
    ...(showSessions ? [{ title: "Sessions", href: href("sessions") }] : []),
    { title: "Users", href: href("users") },
    { title: "Alerts", href: href("alerts"), badge: "New" as const },
  ];
}
