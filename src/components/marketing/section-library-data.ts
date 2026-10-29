export type LibrarySection = {
  anchor: string;
  title: string;
  category: string;
  description: string;
  tone: "yellow" | "coral" | "violet" | "mint" | "light" | "dark";
};

type Entry = readonly [
  anchor: string,
  title: string,
  description: string,
  tone?: LibrarySection["tone"],
];

function sections(
  category: string,
  entries: readonly Entry[],
): LibrarySection[] {
  return entries.map(([anchor, title, description, tone = "dark"]) => ({
    anchor,
    title,
    category,
    description,
    tone,
  }));
}

export const librarySections: LibrarySection[] = [
  ...sections("Heroes", [
    [
      "hero-command-center",
      "Command center",
      "Outcome-led hero with live run health and operating context.",
    ],
    [
      "hero-editorial",
      "Editorial declaration",
      "Large typographic opening on a warm paper surface.",
      "light",
    ],
    [
      "hero-incident",
      "Live incident",
      "Failure-led hero centered on active investigation.",
      "coral",
    ],
    [
      "hero-release-proof",
      "Release proof",
      "Quality score and regression evidence as the opening promise.",
      "mint",
    ],
    [
      "hero-developer",
      "Developer quickstart",
      "Code-first hero for technical buyers.",
      "light",
    ],
    [
      "hero-definitive",
      "Definitive command hero",
      "Combined trace, diagnosis, evaluation, and release proof.",
    ],
    [
      "future-hero-rework",
      "Signal-network hero",
      "Generated agent map with a cinematic release headline.",
      "violet",
    ],
  ]),
  ...sections("Product stories", [
    [
      "concept-execution",
      "Execution report",
      "Editorial release-decision report.",
    ],
    [
      "concept-readme",
      "Implementation brief",
      "README-style path from setup to product proof.",
      "light",
    ],
    [
      "concept-lifecycle",
      "Connected platform",
      "Observe, learn, ship, and watch as one story.",
    ],
    [
      "concept-flight-recorder",
      "Incident flight recorder",
      "Cinematic trace timeline with diagnosis.",
    ],
    [
      "concept-quality-scorecard",
      "Quality scorecard",
      "Quality treated with the clarity of uptime.",
      "light",
    ],
    [
      "concept-release-pipeline",
      "Release pipeline",
      "Straight-line lifecycle from observation to monitoring.",
    ],
    [
      "concept-cost-ledger",
      "Cost anatomy",
      "Spend composition and savings evidence.",
    ],
    [
      "concept-collaboration",
      "Collaborative review",
      "Product and engineering review beside the trace.",
      "light",
    ],
    [
      "concept-session-map",
      "Session behavior map",
      "Six-week view of production activity and drift.",
    ],
    [
      "concept-control-plane",
      "Runtime control plane",
      "Policies, fallbacks, ceilings, and release rules.",
    ],
    [
      "concept-before-after",
      "Before and after lab",
      "Baseline and candidate compared with measurable evidence.",
    ],
    [
      "future-sandbox",
      "Interactive trace sandbox",
      "Clickable run investigation embedded in the homepage.",
      "mint",
    ],
    [
      "future-trace-anatomy",
      "Exploded trace anatomy",
      "Model, tool, retry, score, and release layers.",
    ],
    [
      "future-evaluation-playground",
      "Evaluation playground",
      "Interactive candidate comparison across quality, latency, and cost.",
      "yellow",
    ],
    [
      "future-cost-simulator",
      "Cost simulator",
      "Interactive workload and retry-cost model.",
      "coral",
    ],
  ]),
  ...sections("Customer proof", [
    [
      "proof-logo-wall",
      "Placeholder logo constellation",
      "Six clearly labeled customer-logo placeholders.",
    ],
    [
      "proof-quote-monument",
      "Quote monument",
      "Full-bleed testimonial and outcome metric.",
      "coral",
    ],
    [
      "proof-metric-poster",
      "Metric poster",
      "Oversized case-study outcomes in a poster composition.",
      "yellow",
    ],
    [
      "future-roi-calculator",
      "ROI calculator",
      "Interactive modeled engineering-time and savings opportunity.",
      "yellow",
    ],
    [
      "logos-kinetic-marquee",
      "Kinetic logo marquee",
      "High-energy looping wordmark band with hover pause.",
      "yellow",
    ],
    [
      "logos-editorial-strip",
      "Editorial logo strip",
      "Quiet, high-trust customer-logo band.",
      "light",
    ],
    [
      "logos-monogram-grid",
      "Monogram logo grid",
      "Art-directed customer wall with varied cells.",
      "violet",
    ],
    [
      "logos-inverted-field",
      "Inverted logo field",
      "Dark proof field for product-led pages.",
    ],
    [
      "logos-proof-ledger",
      "Logo proof ledger",
      "Customer marks paired with approved outcome patterns.",
      "coral",
    ],
  ]),
  ...sections("Integrations & architecture", [
    [
      "concept-integration-directory",
      "Integration directory",
      "Provider, framework, and transport directory.",
      "light",
    ],
    [
      "integrations-orbit",
      "Signal orbit",
      "Animated connector constellation around Uncoil.",
      "violet",
    ],
    [
      "integrations-bento",
      "Connector bento",
      "Colorful integration grid with varied emphasis.",
      "light",
    ],
    [
      "integrations-flow",
      "Live data flow",
      "Instrument, route, store, and act as a pipeline.",
    ],
    [
      "future-architecture",
      "Architecture explorer",
      "Five transformations from emitted span to action.",
      "violet",
    ],
  ]),
  ...sections("Security & reliability", [
    [
      "security-data-path",
      "Security data path",
      "Runtime-to-control path with security checkpoints.",
    ],
    [
      "security-vault",
      "Control vault",
      "Circular model for encryption, retention, RBAC, and audit.",
      "yellow",
    ],
    [
      "security-trust-center",
      "Trust center",
      "Enterprise review table with honest availability states.",
    ],
    [
      "future-reliability",
      "Reliability status",
      "Service health, availability, and processing latency.",
      "mint",
    ],
    [
      "future-deployment",
      "Deployment choices",
      "Managed, regional, and private-deployment paths.",
      "violet",
    ],
  ]),
  ...sections("Developer & onboarding", [
    [
      "docs-terminal",
      "Terminal takeover",
      "Large code-first quickstart with first-trace confirmation.",
    ],
    [
      "docs-three-step",
      "Install, trace, inspect",
      "Three executable setup steps.",
      "violet",
    ],
    [
      "docs-reference",
      "Reference atlas",
      "Documentation navigation and quickstart preview.",
    ],
    [
      "future-migration",
      "Gradual migration",
      "Keep existing logs while adding run-level context.",
      "light",
    ],
    [
      "future-onboarding",
      "Five-step onboarding",
      "Project, key, install, trace, and inspect journey.",
    ],
  ]),
  ...sections("Use cases & templates", [
    [
      "use-cases-selector",
      "Agent switchboard",
      "Support, research, coding, and automation selector.",
      "light",
    ],
    [
      "use-cases-stories",
      "Use-case story stack",
      "Full-width workload narratives.",
    ],
    [
      "use-cases-map",
      "Workload map",
      "Four agent types orbiting production evidence.",
      "violet",
    ],
    [
      "future-persona-router",
      "Persona router",
      "Interactive paths for developer, AI lead, product, and security.",
      "light",
    ],
    [
      "future-templates",
      "Agent template gallery",
      "Six starting points for common agent architectures.",
    ],
  ]),
  ...sections("Comparison", [
    [
      "comparison-blind-spots",
      "Logs vs dashboards vs Uncoil",
      "Three-column operating-model comparison.",
    ],
    [
      "comparison-spectrum",
      "Evidence spectrum",
      "Context progression from events to release evidence.",
      "coral",
    ],
    [
      "comparison-before-after",
      "Failure to release",
      "Generated artwork showing chaos resolving into proof.",
      "light",
    ],
  ]),
  ...sections("Workflow & release", [
    [
      "workflow-ribbon",
      "Kinetic lifecycle ribbon",
      "Animated instrument-to-release sequence.",
      "yellow",
    ],
    [
      "workflow-circular",
      "Continuous improvement loop",
      "Circular every-run product model.",
      "violet",
    ],
    [
      "workflow-release-rail",
      "Release rail",
      "Five-stage path ending in promotion proof.",
    ],
    [
      "future-release-gate",
      "Release-gate builder",
      "Interactive configuration of promotion evidence.",
      "mint",
    ],
    [
      "future-page-sequence",
      "Homepage sequence curator",
      "Nine recommended narrative beats for the final page.",
    ],
  ]),
  ...sections("Pricing", [
    [
      "pricing-editorial",
      "Editorial plan cards",
      "Price-first Free, Pro, and Team cards.",
    ],
    [
      "pricing-plan-trio",
      "Light plan trio",
      "Warm-background plan comparison.",
      "light",
    ],
    [
      "pricing-usage-ledger",
      "Decision table",
      "Price, volume, retention, members, and benefits.",
    ],
    [
      "pricing-ledger-light",
      "Stacked plan ledger",
      "Fast-scanning price and payoff rows.",
      "light",
    ],
    [
      "pricing-enterprise",
      "Enterprise pathway",
      "Custom requirements and sales conversion.",
    ],
    [
      "future-pricing-curation",
      "Curated final pricing",
      "One simplified three-plan recommendation.",
      "light",
    ],
  ]),
  ...sections("FAQ & resources", [
    [
      "faq-index",
      "Answer index",
      "Accessible expanding FAQ on a clean white surface.",
      "light",
    ],
    [
      "faq-objection-cards",
      "Objection deck",
      "Four expressive buyer-objection cards.",
    ],
    [
      "faq-conversation",
      "FAQ conversation",
      "Buyer questions answered as a dialogue.",
    ],
    [
      "resources-covers",
      "Editorial covers",
      "Guide, report, and playbook magazine covers.",
      "light",
    ],
    [
      "resources-newsroom",
      "Interactive newsroom",
      "Generated signal artwork with selectable evidence.",
    ],
    [
      "resources-release-notes",
      "Release tape",
      "Horizontal product-update timeline.",
    ],
    [
      "concept-changelog",
      "Release narrative",
      "Signal, change, proof, and rollout story.",
    ],
    [
      "future-newsletter",
      "Editorial newsletter",
      "Focused technical subscription concept.",
      "yellow",
    ],
    [
      "future-announcement",
      "Release announcement",
      "Announcement bar expanded into a feature story.",
      "coral",
    ],
  ]),
  ...sections("Company & community", [
    [
      "future-manifesto",
      "Brand manifesto",
      "Why agent runs require a different observability model.",
      "coral",
    ],
    [
      "future-founder-story",
      "Founder thesis",
      "Origin story and three operating principles.",
      "light",
    ],
    [
      "future-community",
      "Community and open source",
      "SDKs, recipes, examples, and templates.",
    ],
  ]),
  ...sections("Lead generation", [
    [
      "lead-readiness-audit",
      "Production readiness audit",
      "Two-minute diagnostic with a tailored observability scorecard.",
      "yellow",
    ],
    [
      "lead-trace-clinic",
      "Trace clinic",
      "Expert teardown of one real production failure.",
      "coral",
    ],
    [
      "lead-benchmark-report",
      "Agent reliability benchmark",
      "Original research report covering quality, latency, retry cost, and release confidence.",
      "light",
    ],
    [
      "lead-cost-scan",
      "Cost leak scan",
      "Diagnostic that models retry, model, and tool-latency waste.",
      "mint",
    ],
    [
      "lead-migration-brief",
      "Migration brief",
      "Tailored low-risk path from existing logs to complete agent traces.",
      "violet",
    ],
    [
      "lead-email-course",
      "Five-day operator course",
      "Action-led email sequence for operating production agents.",
    ],
  ]),
  ...sections("Contact & CTA", [
    [
      "contact-intake",
      "Enterprise intake",
      "Architecture and operating-problem contact form.",
      "light",
    ],
    [
      "contact-office-hours",
      "Architecture office hours",
      "Working-session calendar concept.",
      "violet",
    ],
    [
      "contact-enterprise-brief",
      "Enterprise design brief",
      "Security and rollout conversation checklist.",
    ],
    ["cta-editorial", "Editorial CTA", "Large centered conversion statement."],
    [
      "cta-proof-panel",
      "Proof-before-promise CTA",
      "Release evidence beside conversion.",
    ],
    [
      "cta-developer",
      "Developer activation CTA",
      "Code preview and quickstart conversion.",
      "light",
    ],
    [
      "cta-release-rail",
      "Release rail CTA",
      "Lifecycle steps ending in signup.",
    ],
    [
      "cta-live-signal",
      "Live-signal CTA",
      "Bright product-proof conversion panel.",
      "light",
    ],
  ]),
  ...sections("Navigation & mobile", [
    [
      "future-navigation",
      "Mega-navigation concept",
      "Product lifecycle grouped into four clear areas.",
      "light",
    ],
    [
      "future-mobile-treatment",
      "Dedicated mobile composition",
      "Thumb-first run and release cards.",
      "violet",
    ],
  ]),
  ...sections("Future 19 system", [
    [
      "navsys-hero-split",
      "Outcome hero",
      "Split product-led hero with live release proof.",
      "light",
    ],
    [
      "navsys-signal-grid",
      "Signal directory",
      "Four-part product map with a black feature panel.",
      "yellow",
    ],
    [
      "navsys-proof-band",
      "Proof band",
      "Full-width placeholder logo strip in the navigation language.",
      "light",
    ],
    [
      "navsys-lifecycle-map",
      "Lifecycle map",
      "Instrument-to-release rail with a featured stage.",
      "yellow",
    ],
    [
      "navsys-trace-report",
      "Trace report",
      "Editorial incident summary beside a technical timeline.",
      "dark",
    ],
    [
      "navsys-eval-scoreboard",
      "Evaluation scoreboard",
      "Candidate comparison and release decision.",
      "yellow",
    ],
    [
      "navsys-developer-install",
      "Developer install",
      "Quickstart narrative paired with a code panel.",
      "dark",
    ],
    [
      "navsys-integration-index",
      "Integration index",
      "Compact provider, framework, transport, and destination ledger.",
      "light",
    ],
    [
      "navsys-usecase-switchboard",
      "Use-case switchboard",
      "Four workload paths in tall navigation cards.",
      "light",
    ],
    [
      "navsys-security-controls",
      "Security controls",
      "Trust narrative paired with a control grid.",
      "yellow",
    ],
    [
      "navsys-comparison-matrix",
      "Comparison matrix",
      "Logs, dashboards, and Uncoil compared in a ledger.",
      "light",
    ],
    [
      "navsys-pricing-ledger",
      "Pricing ledger",
      "Three price-first plans using the menu-card system.",
      "yellow",
    ],
    [
      "navsys-resource-desk",
      "Resource desk",
      "Featured field guide with supporting editorial cards.",
      "dark",
    ],
    [
      "navsys-cta-workshop",
      "Conversion workshop",
      "Trace-clinic CTA with a bright commitment panel.",
      "coral",
    ],
    [
      "navsys-footer-atlas",
      "Footer atlas",
      "Light full-bleed footer with oversized Uncoil wordmark.",
      "light",
    ],
  ]),
  ...sections("Footers", [
    [
      "footer-editorial",
      "Editorial footer",
      "Dark newsletter and categorized navigation.",
    ],
    [
      "footer-newsroom",
      "Newsroom footer",
      "Light publication-style ending.",
      "light",
    ],
    [
      "footer-control-room",
      "Control-room footer",
      "Operational status and product links.",
    ],
    [
      "footer-monument",
      "Brand monument footer",
      "Large light Uncoil wordmark.",
      "light",
    ],
    [
      "footer-full-bleed",
      "Full-bleed wordmark",
      "Edge-to-edge dark Uncoil signature.",
    ],
    [
      "future-footer-finale",
      "Curated footer finale",
      "Final-story footer with oversized brand lockup.",
    ],
  ]),
];

export const libraryCategories = [
  "All",
  ...Array.from(new Set(librarySections.map((section) => section.category))),
] as const;

export type SiteStructure = {
  id: string;
  name: string;
  summary: string;
  bestFor: string;
  sections: readonly string[];
};

export const siteStructures: SiteStructure[] = [
  {
    id: "product-led",
    name: "Product-led",
    summary:
      "Open with the outcome, let visitors use the product, then earn the commercial decision.",
    bestFor: "Broad SaaS launch",
    sections: [
      "hero-definitive",
      "proof-logo-wall",
      "future-sandbox",
      "workflow-circular",
      "lead-readiness-audit",
      "integrations-bento",
      "security-trust-center",
      "pricing-editorial",
      "faq-index",
      "cta-editorial",
      "footer-full-bleed",
    ],
  },
  {
    id: "developer-first",
    name: "Developer-first",
    summary:
      "Lead with setup clarity and technical evidence before introducing plans.",
    bestFor: "SDK and open-source audience",
    sections: [
      "hero-developer",
      "docs-terminal",
      "concept-readme",
      "integrations-flow",
      "future-architecture",
      "comparison-blind-spots",
      "pricing-plan-trio",
      "cta-developer",
      "footer-editorial",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise trust",
    summary:
      "Connect measurable outcomes to security, reliability, deployment, and a working session.",
    bestFor: "Larger teams and sales",
    sections: [
      "hero-release-proof",
      "proof-metric-poster",
      "security-vault",
      "future-reliability",
      "future-deployment",
      "future-roi-calculator",
      "lead-trace-clinic",
      "pricing-enterprise",
      "contact-enterprise-brief",
      "footer-control-room",
    ],
  },
  {
    id: "editorial",
    name: "Editorial brand",
    summary:
      "A point-of-view homepage with strong art direction, resources, and community.",
    bestFor: "Category creation",
    sections: [
      "hero-editorial",
      "future-manifesto",
      "resources-newsroom",
      "future-founder-story",
      "resources-covers",
      "future-community",
      "lead-benchmark-report",
      "future-newsletter",
      "cta-live-signal",
      "footer-monument",
    ],
  },
  {
    id: "conversion",
    name: "Short conversion",
    summary:
      "A compact page focused on proof, product interaction, price, objections, and action.",
    bestFor: "Campaign or launch traffic",
    sections: [
      "future-hero-rework",
      "proof-quote-monument",
      "future-sandbox",
      "lead-cost-scan",
      "future-pricing-curation",
      "faq-conversation",
      "cta-proof-panel",
      "future-footer-finale",
    ],
  },
];

export function findLibrarySection(anchor: string) {
  return librarySections.find((section) => section.anchor === anchor);
}
