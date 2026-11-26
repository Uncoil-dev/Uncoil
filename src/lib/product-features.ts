/** Slugs of the /product/<slug> pages. The page route and the sitemap both read this list. */
export const productFeatureSlugs = ["trace-viewer", "cost-dashboard", "tool-calls", "llm-calls", "failures", "reports", "runtime-control", "evaluation-engine", "lifecycle"] as const;

export type ProductFeatureSlug = (typeof productFeatureSlugs)[number];
