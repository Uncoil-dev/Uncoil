"use client";

import { useState } from "react";
import { AlertHistory } from "./alert-history";
import { AlertsWorkspace } from "./alerts-workspace";
import { BudgetsPanel } from "./budgets-panel";
import { WeeklySummaryPanel } from "./weekly-summary-panel";

const SECTIONS = [
  { id: "rules", label: "Alert rules" },
  { id: "history", label: "History" },
  { id: "budgets", label: "Cost budgets" },
  { id: "weekly", label: "Weekly summary" },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

export function AlertsSections({ projectId }: { projectId: string }) {
  const [section, setSection] = useState<Section>("rules");
  return (
    <div className="flex min-h-svh flex-col bg-[#0B0D10]">
      <nav aria-label="Alerts sections" className="flex gap-1 border-b border-[#1F242C] px-4 pt-2 font-[family-name:var(--font-geist-sans)] text-[13px]">
        {SECTIONS.map((item) => (
          <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)} className={`-mb-px border-b-2 px-3 py-2 ${section === item.id ? "border-[#F4D44D] text-[#F4D44D]" : "border-transparent text-[#8B93A1] hover:text-[#E6E9EE]"}`}>{item.label}</button>
        ))}
      </nav>
      {section === "rules" ? <AlertsWorkspace projectId={projectId} /> : section === "history" ? <AlertHistory projectId={projectId} /> : section === "budgets" ? <BudgetsPanel projectId={projectId} /> : <WeeklySummaryPanel projectId={projectId} />}
    </div>
  );
}
