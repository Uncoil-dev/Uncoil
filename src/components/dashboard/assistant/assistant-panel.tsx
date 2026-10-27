"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Send, ShieldAlert, Sparkles, X } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { describeAction, findByName, TOOL_RISK, tracingHref, type AssistantAction, type AssistantContext, type AssistantTurn } from "@/lib/assistant";

type Status = "pending" | "running" | "done" | "denied" | "failed";
type Message =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; action?: AssistantAction; status?: Status }
  | { kind: "result"; text: string; ok: boolean; secret?: string; href?: string; linkLabel?: string };

const SUGGESTIONS = ["Create a project for my support agent", "Alert me when runs start failing", "Set a $50 monthly budget", "Show me failed traces from the last 7 days"];
const STORAGE_KEY = "tracify.assistant.open";

type Outcome = { text: string; ok: boolean; secret?: string; href?: string; linkLabel?: string; forModel?: string };

export function DashboardAssistant() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const convex = useConvex();
  const { data: session } = authClient.useSession();
  const { data: organization, refetch: refetchOrganization } = authClient.useActiveOrganization();
  const currentId = (params?.projectId as string | undefined) ?? null;
  const projectsQuery = useQuery(api.projects.getProjectsByUserOrOrg, {});
  const rules = useQuery(api.alertRules.overview, currentId ? { projectId: currentId as Id<"projects"> } : "skip");
  const views = useQuery(api.savedViews.list, currentId ? { projectId: currentId as Id<"projects"> } : "skip");

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const projects = (projectsQuery ?? []).map((project) => ({ id: String(project._id), name: project.name }));
  const current = projects.find((project) => project.id === currentId) ?? null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { try { if (window.localStorage.getItem(STORAGE_KEY) === "1") setOpen(true); } catch { /* storage can be blocked */ } }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch { /* storage can be blocked */ } }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, busy, open]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setOpen((value) => !value); }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  function context(): AssistantContext {
    return { projectId: currentId, projectName: current?.name ?? null, projects, alerts: (rules?.rules ?? []).map((rule) => rule.name), views: (views ?? []).map((view) => view.name), page: pathname ?? "" };
  }

  function turns(list: Message[]): AssistantTurn[] {
    return list.map((message): AssistantTurn => (message.kind === "user" ? { role: "user", text: message.text } : message.kind === "assistant" ? { role: "assistant", text: message.text } : { role: "result", text: message.text }));
  }

  async function ask(history: Message[]) {
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: turns(history), context: context() }) });
      const body = await response.json() as { reply?: string; action?: AssistantAction | null; error?: string };
      if (!response.ok || !body.reply) throw new Error(body.error ?? "Something went wrong. Try again.");
      const message: Message = { kind: "assistant", text: body.reply, action: body.action ?? undefined, status: body.action ? "pending" : undefined };
      const next = [...history, message];
      setMessages(next);
      if (body.action && TOOL_RISK[body.action.tool] === "none") await run(next, next.length - 1, body.action);
    } catch (error) {
      setMessages([...history, { kind: "result", text: error instanceof Error ? error.message : "Something went wrong. Try again.", ok: false }]);
    } finally {
      setBusy(false);
    }
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setDraft("");
    // A card nobody answered counts as denied once the person moves on.
    const settled = messages.map((message) => (message.kind === "assistant" && message.status === "pending" ? { ...message, status: "denied" as Status } : message));
    void ask([...settled, { kind: "user", text: clean }]);
  }

  function projectFor(name?: string): { id: string; name: string } | string {
    if (!name) return current ?? "Open a project first, or tell me which one.";
    const found = findByName(projects, name);
    return found.match ?? found.error ?? "I can't find that project.";
  }

  async function execute(action: AssistantAction): Promise<Outcome> {
    const fail = (text: string): Outcome => ({ text, ok: false });
    const clean = (error: unknown) => (error instanceof Error ? error.message.replace(/^[\s\S]*Uncaught Error:\s*/, "").split("\n")[0] : "Something went wrong.");
    try {
      switch (action.tool) {
        case "create_project": {
          const result = await convex.mutation(api.projects.createProject, { name: action.name });
          return { text: `Project "${action.name}" created. Copy its API key now, it is shown only once.`, ok: true, secret: result.plaintextApiKey, href: `/dashboard/${result.projectId}`, linkLabel: "Open project", forModel: `Project "${action.name}" was created and its API key was shown to the person once.` };
        }
        case "create_api_key": {
          const project = projectFor(action.project);
          if (typeof project === "string") return fail(project);
          const result = await convex.mutation(api.projects.rotateApiKey, { projectId: project.id as Id<"projects"> });
          return { text: `New key for "${project.name}". Copy it now, it is shown only once. The old key no longer works.`, ok: true, secret: result.plaintextApiKey, forModel: `A new API key for "${project.name}" was created and shown to the person once. The old key stopped working.` };
        }
        case "create_alert": {
          const project = projectFor(action.project);
          if (typeof project === "string") return fail(project);
          const emailTo = action.emailTo.length ? action.emailTo : session?.user.email ? [session.user.email] : [];
          await convex.mutation(api.alertRules.create, { projectId: project.id as Id<"projects">, name: action.name, metric: action.metric, threshold: action.threshold, windowMinutes: action.windowMinutes, emailTo });
          return { text: `Alert "${action.name}" is on.`, ok: true, href: tracingHref(project.id, "alerts"), linkLabel: "See alerts" };
        }
        case "create_budget": {
          const project = projectFor(action.project);
          if (typeof project === "string") return fail(project);
          const emailTo = action.emailTo.length ? action.emailTo : session?.user.email ? [session.user.email] : [];
          await convex.mutation(api.budgets.create, { projectId: project.id as Id<"projects">, name: action.name, period: action.period, limitUsd: action.limitUsd, warnAtPercent: action.warnAtPercent, emailTo });
          return { text: `Budget "${action.name}" is on.`, ok: true, href: tracingHref(project.id, "costs"), linkLabel: "See costs" };
        }
        case "invite_teammate": {
          if (!organization) return fail("Team invites need a team workspace. This account is personal.");
          const result = await authClient.organization.inviteMember({ email: action.email, role: action.role, organizationId: organization.id });
          if (result.error) return fail(result.error.message || "Could not create the invite.");
          const id = (result.data as { id?: string } | null)?.id;
          const link = id ? `${window.location.origin}/accept-invitation?id=${id}` : undefined;
          return { text: link ? `Invite for ${action.email} is ready. Send them this link, it works for 7 days.` : `Invite for ${action.email} is ready.`, ok: true, secret: link, forModel: `An invite for ${action.email} was created.` };
        }
        case "open_page": {
          if (!currentId) return fail("Open a project first.");
          const href = tracingHref(currentId, action.page, action.filters);
          router.push(href);
          return { text: `Opened ${action.page}.`, ok: true };
        }
        case "open_saved_view": {
          if (!currentId) return fail("Open a project first.");
          const found = findByName((views ?? []).map((view) => ({ name: view.name, view })), action.name);
          if (!found.match) return fail(found.error ?? "I can't find that view.");
          const { view } = found.match;
          router.push(`/dashboard/${currentId}/${view.target === "steps" ? "steps" : "tracing"}?${new URLSearchParams(view.query).toString()}`);
          return { text: `Opened view "${view.name}".`, ok: true };
        }
        case "save_view": {
          if (!currentId) return fail("Open a project first.");
          await convex.mutation(api.savedViews.save, { projectId: currentId as Id<"projects">, name: action.name, target: "traces", shared: false, query: action.filters, columns: [] });
          return { text: `Saved view "${action.name}".`, ok: true, href: tracingHref(currentId, "tracing", action.filters), linkLabel: "Open it" };
        }
        case "delete_alert": {
          const project = projectFor(action.project);
          if (typeof project === "string") return fail(project);
          const overview = await convex.query(api.alertRules.overview, { projectId: project.id as Id<"projects"> });
          const found = findByName((overview?.rules ?? []).map((rule) => ({ name: rule.name, id: rule._id })), action.name);
          if (!found.match) return fail(found.error ?? "I can't find that alert.");
          await convex.mutation(api.alertRules.remove, { ruleId: found.match.id });
          return { text: `Alert "${found.match.name}" deleted.`, ok: true };
        }
        case "remove_teammate": {
          if (!organization) return fail("Removing teammates needs a team workspace.");
          const member = organization.members?.find((entry) => entry.user.email.toLowerCase() === action.email);
          if (!member) return fail(`${action.email} isn't on this team.`);
          if (member.role === "owner") return fail("The owner can't be removed.");
          const result = await authClient.organization.removeMember({ memberIdOrEmail: member.id, organizationId: organization.id });
          if (result.error) return fail(result.error.message || "Could not remove them.");
          await refetchOrganization();
          return { text: `${action.email} was removed.`, ok: true };
        }
        case "delete_project": {
          const project = projectFor(action.project);
          if (typeof project === "string") return fail(project);
          await convex.mutation(api.projects.deleteProject, { projectId: project.id as Id<"projects">, confirmationName: project.name, confirmationWord: "DELETE" });
          if (project.id === currentId) router.push("/dashboard");
          return { text: `Project "${project.name}" deleted.`, ok: true };
        }
        case "change_plan": {
          if (!currentId) return fail("Open a project first.");
          const response = await fetch(action.plan === "manage" ? "/api/stripe/portal" : "/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action.plan === "manage" ? { projectId: currentId } : { projectId: currentId, plan: action.plan, interval: action.interval ?? "monthly" }) });
          const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
          if (!response.ok || !data.url) return fail(data.error ?? "Billing isn't available right now.");
          window.location.assign(data.url);
          return { text: "Opening Stripe. Nothing is charged until you confirm there.", ok: true };
        }
      }
    } catch (error) {
      return fail(clean(error));
    }
  }

  async function run(list: Message[], index: number, action: AssistantAction) {
    const mark = (status: Status) => list.map((message, at) => (at === index && message.kind === "assistant" ? { ...message, status } : message));
    setMessages(mark("running"));
    const outcome = await execute(action);
    const done = mark(outcome.ok ? "done" : "failed");
    const next: Message[] = [...done, { kind: "result", text: outcome.forModel ?? outcome.text, ok: outcome.ok, secret: undefined }];
    // The person sees the full result (with any key); the model only sees the plain sentence, never a secret.
    setMessages([...done, { kind: "result", text: outcome.text, ok: outcome.ok, secret: outcome.secret, href: outcome.href, linkLabel: outcome.linkLabel }]);
    if (TOOL_RISK[action.tool] !== "none" && outcome.ok) {
      setBusy(true);
      try {
        const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: turns(next), context: context() }) });
        const body = await response.json() as { reply?: string; action?: AssistantAction | null };
        if (response.ok && body.reply) setMessages((existing) => [...existing, { kind: "assistant", text: body.reply!, action: body.action ?? undefined, status: body.action ? "pending" : undefined }]);
      } catch { /* the result line above already told the person what happened */ }
      setBusy(false);
    }
  }

  function decide(index: number, allow: boolean) {
    const message = messages[index];
    if (message?.kind !== "assistant" || !message.action || message.status !== "pending") return;
    if (allow) { void run(messages, index, message.action); return; }
    setMessages([...messages.map((entry, at) => (at === index && entry.kind === "assistant" ? { ...entry, status: "denied" as Status } : entry)), { kind: "result", text: "You said no. Nothing was changed.", ok: true }]);
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard can be blocked */ }
  }

  return (
    <>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Open the assistant" title="Assistant (Ctrl+J)" className="fixed bottom-4 right-4 z-40 flex h-11 items-center gap-2 border border-[#f4d44d] bg-[#f4d44d] px-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[#090909] shadow-[4px_4px_0_#090909] outline-none hover:bg-[#fff4b5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <Sparkles className="size-4" /> Assistant
        </button>
      ) : null}
      {open ? (
        <aside aria-label="Assistant" className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/15 bg-[#0c0c0c] font-mono text-[#eceae3] shadow-[-12px_0_40px_rgba(0,0,0,0.5)] sm:w-[420px]">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/15 px-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"><span className="size-2 bg-[#f4d44d]" />Assistant<span className="font-normal normal-case tracking-normal text-white/45">{current ? `· ${current.name}` : ""}</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="flex size-8 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
          </header>
          <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[15px] font-bold leading-6 text-white">What should I do for you?</p>
                  <p className="mt-1 text-[12px] leading-5 text-white/55">I can create projects and keys, set alerts and budgets, invite teammates and jump to the right page. I always ask before I change anything.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion)} className="border border-white/15 bg-white/[0.03] px-3 py-2.5 text-left text-[12px] text-white/85 hover:border-[#f4d44d] hover:bg-white/[0.06]">{suggestion}</button>)}
                </div>
              </div>
            ) : (
              <ol aria-live="polite" className="flex flex-col gap-3">
                {messages.map((message, index) => {
                  if (message.kind === "user") return <li key={index} className="max-w-[88%] self-end bg-[#f4d44d] px-3 py-2 text-[12px] leading-5 text-[#090909]">{message.text}</li>;
                  if (message.kind === "result") return (
                    <li key={index} className={`border-l-2 px-3 py-1.5 text-[12px] leading-5 ${message.ok ? "border-[#f4d44d] text-white/80" : "border-red-500 text-red-300"}`}>
                      {message.text}
                      {message.secret ? (
                        <div className="mt-2 flex items-center gap-2 border border-white/15 bg-black/50 p-2">
                          <code className="min-w-0 flex-1 break-all text-[11px] text-[#f4d44d]">{message.secret}</code>
                          <button type="button" onClick={() => void copy(message.secret!)} aria-label="Copy" className="flex size-7 shrink-0 items-center justify-center border border-white/20 hover:border-[#f4d44d]">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
                        </div>
                      ) : null}
                      {message.href ? <button type="button" onClick={() => router.push(message.href!)} className="mt-2 block text-[11px] font-bold uppercase tracking-widest text-[#f4d44d] hover:underline">{message.linkLabel ?? "Open"} →</button> : null}
                    </li>
                  );
                  const info = message.action ? describeAction(message.action) : null;
                  const danger = message.action ? TOOL_RISK[message.action.tool] === "danger" : false;
                  return (
                    <li key={index} className="flex flex-col gap-2">
                      <p className="whitespace-pre-wrap text-[12px] leading-5 text-white/90">{message.text}</p>
                      {info && message.action && TOOL_RISK[message.action.tool] !== "none" ? (
                        <div role="group" aria-label="Permission needed" className={`border p-3 ${danger ? "border-red-500/70 bg-red-500/[0.07]" : "border-[#f4d44d]/60 bg-[#f4d44d]/[0.06]"} ${message.status === "denied" ? "opacity-50" : ""}`}>
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${danger ? "text-red-300" : "text-[#f4d44d]"}`}>{danger ? <ShieldAlert className="size-3.5" /> : <KeyRound className="size-3.5" />}{message.status === "pending" ? "Permission needed" : message.status === "running" ? "Working…" : message.status === "done" ? "Allowed" : message.status === "denied" ? "Not allowed" : "Didn't work"}</div>
                          <p className="mt-1.5 text-[12px] font-bold leading-5 text-white">{info.title}</p>
                          {info.detail ? <p className="mt-0.5 text-[11px] leading-5 text-white/60">{info.detail}</p> : null}
                          {message.status === "pending" ? (
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => decide(index, true)} className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest ${danger ? "bg-red-500 text-white hover:bg-red-400" : "bg-[#f4d44d] text-[#090909] hover:bg-[#fff4b5]"}`}>{info.confirmLabel}</button>
                              <button type="button" onClick={() => decide(index, false)} className="h-8 border border-white/25 px-3 text-[10px] uppercase tracking-widest text-white/75 hover:border-white/60">Not now</button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {busy ? <li className="text-[11px] text-white/45">Thinking…</li> : null}
              </ol>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); send(draft); }} className="flex shrink-0 gap-2 border-t border-white/15 p-3">
            <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
            <input ref={input} id="assistant-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Tell me what to do…" autoComplete="off" className="h-10 min-w-0 flex-1 border border-white/20 bg-black/40 px-3 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-[#f4d44d]" />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex size-10 items-center justify-center bg-[#f4d44d] text-[#090909] disabled:opacity-40"><Send className="size-4" /></button>
          </form>
          <p className="shrink-0 px-4 pb-3 text-[10px] text-white/35">AI can be wrong. It only acts after you say yes. Ctrl+J opens and closes this.</p>
        </aside>
      ) : null}
    </>
  );
}
