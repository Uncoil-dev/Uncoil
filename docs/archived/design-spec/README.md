# uncoil — Full Frontend Design Package
**Index of design specification files**

---

## Document Files

| File | Sections | Contents |
|------|----------|---------|
| `01-04-foundations.md` | §01–04 | Cover, Principles, Tokens, Typography |
| `05-08-system.md` | §05–08 | Color system, Spacing, Components, Layouts |
| `09-12-pages-auth-onboarding.md` | §09–12 | Marketing pages, Auth, Onboarding, Dashboard shell |
| `13-21-dashboard-pages.md` | §13–21 | Dashboard overview, Runs, Trace viewer, Cost, Alerts, Settings, Billing, Team |
| `22-27-api-docs-blog-pricing.md` | §22–27 | API keys, Docs, Blog, Pricing, Changelog |
| `28-37-support-states-infra.md` | §28–37 | Support, Legal, Errors, States, Mobile, a11y, Motion, Copy, SEO, File structure |
| `38-40-checklists-prompts.md` | §38–40 | Implementation checklist, Build prompts, QA checklist |

---

## Key Design Decisions (Quick Reference)

| Decision | Value |
|----------|-------|
| Background | `#0A0A0A` |
| Surface | `#111111` / `#161616` / `#1C1C1C` |
| Border | `1px solid #2A2A2A` |
| Accent | `#6366F1` |
| Tagline | "Five signals. One truth." |
| Border radius | `0px` everywhere |
| Shadows | None |
| Logo font | Geist Pixel Square |
| UI font | Geist Mono |
| Prose font | Geist Sans |
| Free tier | 50,000 spans/month |
| Onboarding route | `/onboarding/project` (not `/onboarding`) |
| Sign-up redirect | `/onboarding/project` |
| Clerk `colorInputBackground` | `#1C1C1C` |

---

## Corrections vs. Original Brief

1. **Free tier:** 50,000 spans/month (not 1,000/day as in original draft)
2. **Hero code sample:** Uses actual `uncoil` API: `trace_agent`, `llm_call`, `tool_call`
3. **Tagline:** "Five signals. One truth." (not "every step your agent takes" as tagline)
4. **Integrations:** Autogen, CrewAI, Haystack, DSPy, Semantic Kernel added to framework grid
5. **Auth:** Clerk `colorInputBackground: "#1C1C1C"` (Surface 3, not Surface 2)
6. **Onboarding:** Step 2 includes "Download .env" option; Step 3 has explicit "Skip for now" link
7. **Onboarding Step 4:** 60-second timeout with troubleshooting accordion (not just "troubleshoot" link)
8. **Sidebar nav order:** Overview / Runs / Costs / Alerts — then — API Keys / Team / Settings
9. **Sidebar bottom:** Docs link + Clerk UserButton + notification bell (not just user avatar)
10. **Dashboard stat cards:** Total spend today / Spans today / Active runs / Failed runs today
