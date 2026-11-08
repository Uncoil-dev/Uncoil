import { Reveal } from "@/components/marketing/landing/reveal";
import { BACKUP_DAYS, dataLocations, retentionRows } from "@/lib/data-locations";

const badge = {
  yes: { label: "EU", cls: "bg-[#f4d44d] text-black" },
  own: { label: "Our server", cls: "border border-white/40 text-white" },
  no: { label: "Outside EU", cls: "border border-[#f4d44d] text-[#f4d44d]" },
} as const;

/** Every kind of stored data, where it sits, and whether that place is in the EU. */
export function DataLedger() {
  return (
    <div className="mt-12 border-y border-white/15">
      <div className="hidden grid-cols-[1.1fr_1fr_1fr_auto] gap-6 border-b border-white/15 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 md:grid">
        <span>Data</span><span>Held by</span><span>Place</span><span className="w-28 text-right">Status</span>
      </div>
      <ul>
        {dataLocations.map((row, i) => (
          <Reveal key={row.what} delay={i * 0.05}>
            <li className="grid gap-2 border-b border-white/10 py-5 last:border-b-0 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-start md:gap-6">
              <div>
                <p className="font-pixel text-2xl leading-none tracking-[-0.05em]">{row.what}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">{row.note}</p>
              </div>
              <p className="font-mono text-sm text-white/85">{row.where}</p>
              <p className="font-mono text-sm text-white/65">{row.place}</p>
              <span className={`w-fit justify-self-start px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] md:w-28 md:justify-self-end md:text-center ${badge[row.eu].cls}`}>{badge[row.eu].label}</span>
            </li>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

const steps = [
  ["Download", "Settings, then Data. One JSON file with every trace, step, score, alert, comment, prompt and dataset. API keys, billing details and webhook addresses are left out."],
  ["Delete", "Type the project name and the word DELETE. Trace storage is cleared first. If that fails, nothing is deleted and you can retry. Then every project record is removed and the API key stops working."],
  ["Backups roll off", `Backups are not kept past ${BACKUP_DAYS} days, so deleted data is fully gone from them within ${BACKUP_DAYS} days.`],
  ["Whole account", "Email privacy@uncoil.dev and we delete your account data. Stripe keeps billing records under its own rules."],
] as const;

export function DeletionPromise() {
  return (
    <>
      <ol className="mk-gap grid gap-0 border-y-2 border-black md:grid-cols-4">
        {steps.map(([title, body], i) => (
          <Reveal key={title} delay={i * 0.08}>
            <li className={`flex h-full min-h-[280px] flex-col justify-between p-6 md:border-r-2 md:border-black md:last:border-r-0 ${i === 1 ? "bg-black text-[#eceae3]" : i === 2 ? "bg-[#f4d44d]" : ""}`}>
              <span className="font-pixel text-6xl leading-none">0{i + 1}</span>
              <div>
                <h3 className="font-pixel text-3xl leading-none tracking-[-0.05em]">{title}</h3>
                <p className={`mt-3 text-sm leading-6 ${i === 1 ? "text-white/65" : "text-black/70"}`}>{body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black/65">
        <span className="text-black">Automatic clean-up, every day:</span>
        {retentionRows.map(([plan, days]) => (
          <span key={plan} className="border border-black/40 px-2.5 py-1">{plan} {days} days</span>
        ))}
      </div>
    </>
  );
}
