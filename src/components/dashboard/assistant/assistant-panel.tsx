"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowUp, Bell, Check, ChevronDown, ChevronRight, Copy, Globe2, KeyRound, Maximize2, Minimize2, PanelLeft, Plus, Search, ShieldAlert, ShieldCheck, Square, ThumbsDown, ThumbsUp, UserPlus, Wallet, X } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { projectCreateError } from "@/lib/project-errors";
import { describeAction, findByName, partialReply, partialThinking, TOOL_RISK, tracingHref, type AssistantAction, type AssistantContext, type AssistantTurn } from "@/lib/assistant";

type Status = "pending" | "running" | "done" | "denied" | "failed";
type Message =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; thinking?: string; action?: AssistantAction; status?: Status }
  | { kind: "result"; text: string; ok: boolean; title?: string; secret?: string; href?: string; linkLabel?: string };

const SUGGESTIONS = [
  { icon: Plus, title: "Create a project", sub: "Set up a project and get its key", prompt: "Create a project for my support agent" },
  { icon: Bell, title: "Alert me on failures", sub: "Get told when runs start failing", prompt: "Alert me when runs start failing" },
  { icon: Wallet, title: "Set a spending budget", sub: "Warn me before costs run away", prompt: "Set a $50 monthly budget" },
  { icon: UserPlus, title: "Invite a teammate", sub: "Share this workspace", prompt: "Invite a teammate" },
  { icon: Search, title: "Show failed traces", sub: "Jump to the last 7 days of errors", prompt: "Show me failed traces from the last 7 days" },
];
const greeting = () => { const hour = new Date().getHours(); return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; };
const STORAGE_KEY = "tracify.assistant.open";
const REASONING_KEY = "tracify.assistant.reasoning";
const CHATS_KEY = "tracify.assistant.chats";
const MAX_CHATS = 30;

type Chat = { id: string; title: string; updatedAt: number; messages: Message[] };

/** Chats are kept in this browser only. Keys and invite links are never saved, and a card nobody answered is saved as "not allowed". */
function loadChats(): Chat[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHATS_KEY) ?? "[]") as Chat[];
    return Array.isArray(parsed) ? parsed.filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages)).slice(0, MAX_CHATS) : [];
  } catch { return []; }
}
function saveChats(chats: Chat[]) {
  const safe = chats.slice(0, MAX_CHATS).map((chat) => ({
    ...chat,
    messages: chat.messages.map((message): Message => {
      if (message.kind === "result") return { ...message, secret: undefined };
      if (message.kind === "assistant" && (message.status === "pending" || message.status === "running")) return { ...message, status: message.status === "pending" ? "denied" : "failed" };
      return message;
    }),
  }));
  try { window.localStorage.setItem(CHATS_KEY, JSON.stringify(safe)); } catch { /* storage can be blocked or full */ }
}
/** Reads the streamed answer line by line, showing the words as they come, and returns the final parsed reply. */
async function readReply(stream: ReadableStream<Uint8Array>, show: (text: string, thinking: string) => void): Promise<{ reply?: string; action?: AssistantAction | null; thinking?: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  let final: { reply?: string; action?: AssistantAction | null; thinking?: string } | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line) as { delta?: string; done?: { reply?: string; action?: AssistantAction | null; thinking?: string } };
      if (typeof event.delta === "string") { raw += event.delta; show(partialReply(raw), partialThinking(raw)); }
      if (event.done) final = event.done;
    } catch {
      // A broken line is skipped.
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  handle(buffer);
  return final ?? {};
}
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const chatTitle = (messages: Message[]) => { const first = messages.find((message) => message.kind === "user"); return first ? first.text.slice(0, 60) : "New conversation"; };

function groupChats(chats: Chat[]) {
  const now = Date.now();
  const day = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups: Array<{ label: string; items: Chat[] }> = [{ label: "Today", items: [] }, { label: "Past week", items: [] }, { label: "Older", items: [] }];
  for (const chat of chats) groups[chat.updatedAt >= startOfToday ? 0 : now - chat.updatedAt < 7 * day ? 1 : 2].items.push(chat);
  return groups.filter((group) => group.items.length);
}

/** The assistant's short "why", folded away until asked for (or always open if the person chose that). */
function Reasoning({ text, open, live = false }: { text: string; open: boolean; live?: boolean }) {
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? open;
  return (
    <div className="mb-2">
      <button type="button" onClick={() => setManual(!expanded)} aria-expanded={expanded} className="asst-motion flex items-center gap-1 text-[11px] text-white/45 transition hover:text-white/80">
        <ChevronRight className={`size-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />{live ? "Thinking…" : "See reasoning"}
      </button>
      {expanded ? <p className="asst-rise mt-1.5 whitespace-pre-wrap border-l border-white/15 pl-3 text-[11px] italic leading-5 text-white/50">{text}</p> : null}
    </div>
  );
}

/** The pixel mark: a small grid of squares that twinkle; it flickers faster while the assistant is working. */
const MARK_ON = [2, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 22];
const MARK_DIM = [1, 3, 5, 9, 15, 19, 21, 23];
function AssistantMark({ cell = 12, busy = false }: { cell?: number; busy?: boolean }) {
  return (
    <span aria-hidden className="inline-grid shrink-0 grid-cols-5 gap-[2px]">
      {Array.from({ length: 25 }, (_, n) => {
        const on = MARK_ON.includes(n);
        const dim = MARK_DIM.includes(n);
        return <span key={n} style={{ width: cell, height: cell, animationDelay: `${(n * 137) % 1600}ms` }} className={on || dim ? `${busy ? "asst-twinkle-fast" : "asst-twinkle"} bg-[#f4d44d]` : ""} />;
      })}
    </span>
  );
}

/** Types the greeting out one letter at a time (instantly for people who prefer less motion). */
function Greeting({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text.length); return; } // eslint-disable-line react-hooks/set-state-in-effect
    setShown(0);
    const timer = window.setInterval(() => setShown((count) => { if (count >= text.length) { window.clearInterval(timer); return count; } return count + 1; }), 38);
    return () => window.clearInterval(timer);
  }, [text]);
  const done = shown >= text.length;
  return (
    <div className="text-center">
      <p aria-label={text} className="min-h-7 text-[17px] font-bold text-white">{text.slice(0, shown)}<span aria-hidden className={`ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-[#f4d44d] ${done ? "asst-caret" : ""}`} /></p>
      <p className={`mt-1 text-[12px] text-white/55 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}>What are we doing today?</p>
    </div>
  );
}

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
  const [full, setFull] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState(newId);
  const [loaded, setLoaded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [liveThinking, setLiveThinking] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rated, setRated] = useState<Record<number, "up" | "down">>({});
  const openState = useRef({ open, menu, history: historyOpen, full });
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);

  const projects = (projectsQuery ?? []).map((project) => ({ id: String(project._id), name: project.name }));
  const current = projects.find((project) => project.id === currentId) ?? null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try { if (window.localStorage.getItem(STORAGE_KEY) === "1") setOpen(true); if (window.localStorage.getItem(REASONING_KEY) === "1") setShowReasoning(true); } catch { /* storage can be blocked */ }
    setChats(loadChats());
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { openState.current = { open, menu, history: historyOpen, full }; });
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch { /* storage can be blocked */ } }, [open]);
  useEffect(() => { try { window.localStorage.setItem(REASONING_KEY, showReasoning ? "1" : "0"); } catch { /* storage can be blocked */ } }, [showReasoning]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, busy, open, live]);
  // Keep this conversation in the saved list as it grows.
  useEffect(() => {
    if (!loaded || !messages.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChats((existing) => {
      const next = [{ id: chatId, title: chatTitle(messages), updatedAt: Date.now(), messages }, ...existing.filter((chat) => chat.id !== chatId)].slice(0, MAX_CHATS);
      saveChats(next);
      return next;
    });
  }, [messages, chatId, loaded]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setOpen((value) => !value); }
      if (event.key === "Escape" && openState.current.open) {
        const { menu: menuOpen, history, full: fullView } = openState.current;
        if (menuOpen || history) { setMenu(false); setHistoryOpen(false); } else if (fullView) setFull(false); else setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) { const timer = window.setTimeout(() => input.current?.focus(), 240); return () => window.clearTimeout(timer); } }, [open]);

  /** The dotted background follows the pointer: a soft yellow glow, brighter dots under it, and a slight drift. */
  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    glow.current?.style.setProperty("--mx", `${x}px`);
    glow.current?.style.setProperty("--my", `${y}px`);
    if (dots.current) dots.current.style.backgroundPosition = `${((x / box.width) - 0.5) * -10}px ${((y / box.height) - 0.5) * -10}px`;
  }

  function context(): AssistantContext {
    return { projectId: currentId, projectName: current?.name ?? null, projects, alerts: (rules?.rules ?? []).map((rule) => rule.name), views: (views ?? []).map((view) => view.name), page: pathname ?? "" };
  }

  function turns(list: Message[]): AssistantTurn[] {
    return list.map((message): AssistantTurn => (message.kind === "user" ? { role: "user", text: message.text } : message.kind === "assistant" ? { role: "assistant", text: message.text } : { role: "result", text: message.text }));
  }

  /** Asks the model and shows its words as they are written. Returns the finished message. `history` is what the model is told; the screen keeps whatever is already shown. */
  async function reply(history: Message[]): Promise<Message> {
    setLive("");
    setLiveThinking("");
    const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: turns(history), context: context(), stream: true }) });
    if (!response.ok || !response.body) {
      const failed = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(failed.error ?? "Something went wrong. Try again.");
    }
    const body = await readReply(response.body, (text, thinking) => { setLive(text); setLiveThinking(thinking); });
    if (!body.reply) throw new Error("Something went wrong. Try again.");
    if (readOnly && body.action && TOOL_RISK[body.action.tool] !== "none") return { kind: "assistant", text: "I'm in read-only mode, so I can't change anything. Switch it off under Permissions and ask again." };
    return { kind: "assistant", text: body.reply, thinking: body.thinking, action: body.action ?? undefined, status: body.action ? "pending" : undefined };
  }

  async function ask(history: Message[]) {
    setBusy(true);
    // The person's message shows at once; it should not wait for the answer.
    setMessages(history);
    try {
      const message = await reply(history);
      const next = [...history, message];
      setMessages(next);
      if (message.kind === "assistant" && message.action && TOOL_RISK[message.action.tool] === "none") await run(next, next.length - 1, message.action);
    } catch (error) {
      setMessages([...history, { kind: "result", text: error instanceof Error ? error.message : "Something went wrong. Try again.", ok: false }]);
    } finally {
      setBusy(false);
      setLive("");
      setLiveThinking("");
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
    // The server's own plain-language reason travels in the error data; the error text itself is just "Server Error".
    const clean = (error: unknown) => {
      const message = projectCreateError(error, "Something went wrong.").message.replace(/^[\s\S]*Uncaught (?:Convex)?Error:\s*/, "").split("\n")[0];
      if (!/Server Error/.test(message)) return message;
      const reference = /Request ID: (\w+)/.exec(message)?.[1];
      return `That didn't work on our side${reference ? ` (reference ${reference})` : ""}. Try again in a moment.`;
    };
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
      const code = projectCreateError(error).code;
      const hint = code === "project_limit" && currentId ? { href: tracingHref(currentId, "billing"), linkLabel: "See plans" } : {};
      return { ...fail(clean(error)), ...hint };
    }
  }

  async function run(list: Message[], index: number, action: AssistantAction) {
    const mark = (status: Status) => list.map((message, at) => (at === index && message.kind === "assistant" ? { ...message, status } : message));
    setMessages(mark("running"));
    const outcome = await execute(action);
    const done = mark(outcome.ok ? "done" : "failed");
    const next: Message[] = [...done, { kind: "result", text: outcome.forModel ?? outcome.text, ok: outcome.ok, secret: undefined }];
    // The person sees the full result (with any key); the model only sees the plain sentence, never a secret.
    setMessages([...done, { kind: "result", text: outcome.text, ok: outcome.ok, title: outcome.ok ? undefined : describeAction(action).title, secret: outcome.secret, href: outcome.href, linkLabel: outcome.linkLabel }]);
    if (TOOL_RISK[action.tool] !== "none") {
      setBusy(true);
      try {
        const message = await reply(outcome.ok ? next : [...done, { kind: "result", text: `Failed: ${outcome.text}`, ok: false }]);
        setMessages((existing) => [...existing, message]);
      } catch { /* the result line above already told the person what happened */ }
      setBusy(false);
      setLive("");
      setLiveThinking("");
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


  const title = chatTitle(messages);
  const grouped = useMemo(() => groupChats(chats.filter((chat) => !search.trim() || chat.title.toLowerCase().includes(search.trim().toLowerCase()))), [chats, search]);

  function startChat() {
    if (busy) return;
    setMessages([]); setChatId(newId()); setDraft(""); setRated({}); setHistoryOpen(false);
    input.current?.focus();
  }
  function openChat(chat: Chat) {
    if (busy) return;
    setMessages(chat.messages); setChatId(chat.id); setRated({}); setHistoryOpen(false);
  }
  function removeChat(id: string) {
    setChats((existing) => { const next = existing.filter((chat) => chat.id !== id); saveChats(next); return next; });
    if (id === chatId) { setMessages([]); setChatId(newId()); }
  }

  const iconButton = "asst-motion flex size-9 items-center justify-center text-white/60 transition duration-150 hover:bg-white/10 hover:text-white active:scale-90";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open the assistant" title="Assistant (Ctrl+J)" tabIndex={open ? -1 : 0} className={`asst-motion fixed bottom-4 right-4 z-40 flex h-11 items-center gap-2.5 border border-[#f4d44d] bg-[#f4d44d] px-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[#090909] shadow-[4px_4px_0_#090909] outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff4b5] hover:shadow-[6px_6px_0_#090909] active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${open ? "pointer-events-none translate-y-3 scale-90 opacity-0" : ""}`}>
        <span className="[&_span]:!bg-[#090909]"><AssistantMark cell={3} /></span> Assistant
      </button>
      <aside aria-label="Assistant" aria-hidden={!open} inert={!open} style={{ width: full ? "100vw" : "min(420px, 100vw)" }} className={`asst-motion fixed inset-y-0 right-0 z-50 flex border-l border-white/10 bg-[#0b0b0b] font-mono text-[#eceae3] shadow-[-16px_0_48px_rgba(0,0,0,0.55)] transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${open ? "translate-x-0 opacity-100" : "pointer-events-none invisible translate-x-8 opacity-0"}`}>
        {full ? (
          <nav aria-label="Conversations" className={`hidden shrink-0 flex-col border-r border-white/10 bg-[#0e0e0e] transition-[width] duration-300 md:flex ${sidebarOpen ? "w-[272px]" : "w-0 overflow-hidden border-r-0"}`}>
            <div className="flex h-14 shrink-0 items-center justify-between px-4"><span className="flex items-center gap-2.5 text-[12px] font-bold text-white"><AssistantMark cell={3} busy={busy} />Chat</span><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Hide conversations" className={iconButton}><PanelLeft className="size-4" /></button></div>
            <div className="flex flex-col gap-0.5 px-2 pb-2">
              <button type="button" onClick={startChat} disabled={busy} className="asst-motion flex items-center gap-2.5 px-3 py-2 text-left text-[12px] text-white/85 transition hover:bg-white/10 disabled:opacity-40"><Plus className="size-4" />New chat</button>
              <label className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/85 focus-within:bg-white/10"><Search className="size-4 shrink-0" /><span className="sr-only">Search chats</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/85" /></label>
            </div>
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {grouped.length === 0 ? <p className="px-3 py-3 text-[11px] text-white/40">{chats.length ? "No chats match." : "Your chats will show up here."}</p> : grouped.map((group) => (
                <div key={group.label} className="mt-3">
                  <p className="px-3 pb-1 text-[11px] font-bold text-white">{group.label}</p>
                  {group.items.map((chat) => (
                    <div key={chat.id} className={`group asst-motion flex items-center transition ${chat.id === chatId ? "bg-white/[0.09]" : "hover:bg-white/[0.05]"}`}>
                      <button type="button" onClick={() => openChat(chat)} disabled={busy} className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-[12px] disabled:opacity-60 ${chat.id === chatId ? "font-bold text-white" : "text-white/65"}`}>{chat.title}</button>
                      <button type="button" onClick={() => removeChat(chat.id)} aria-label={`Delete chat ${chat.title}`} className="mr-1 flex size-6 shrink-0 items-center justify-center text-white/0 transition hover:text-red-300 group-hover:text-white/40 focus-visible:text-white/60"><X className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3">
            {full && !sidebarOpen ? <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Show conversations" className={`${iconButton} max-md:hidden`}><PanelLeft className="size-4" /></button> : null}
            <div className="relative min-w-0 flex-1">
              <button type="button" onClick={() => setHistoryOpen((value) => !value)} aria-expanded={historyOpen} aria-haspopup="listbox" className={`asst-motion flex w-full min-w-0 items-center gap-2 bg-white/[0.04] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-white/[0.08] ${full ? "justify-center" : ""}`}>
                {!full ? <AssistantMark cell={2} busy={busy} /> : null}<span className="truncate">{title}</span><ChevronDown className={`size-3.5 shrink-0 text-white/50 transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`} />
              </button>
              {historyOpen ? (
                <div role="listbox" aria-label="Conversations" className="asst-pop absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 origin-top overflow-y-auto border border-white/15 bg-[#151515] p-1 shadow-xl">
                  <button type="button" onClick={startChat} disabled={busy} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#f4d44d] hover:bg-white/10 disabled:opacity-40"><Plus className="size-4" />New chat</button>
                  {chats.length === 0 ? <p className="px-3 py-2 text-[11px] text-white/40">Past chats show up here.</p> : chats.slice(0, 12).map((chat) => (
                    <button key={chat.id} type="button" role="option" aria-selected={chat.id === chatId} onClick={() => openChat(chat)} disabled={busy} className={`block w-full truncate px-3 py-2 text-left text-[12px] hover:bg-white/10 disabled:opacity-60 ${chat.id === chatId ? "font-bold text-white" : "text-white/65"}`}>{chat.title}</button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={startChat} disabled={busy} aria-label="New conversation" title="New conversation" className={`${iconButton} disabled:opacity-40`}><Plus className="size-4" /></button>
            <button type="button" onClick={() => setFull((value) => !value)} aria-label={full ? "Back to side panel" : "Open full view"} title={full ? "Back to side panel" : "Full view with all chats"} className={`${iconButton} max-sm:hidden`}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
            <button type="button" onClick={() => { setFull(false); setOpen(false); }} aria-label="Close assistant" className={iconButton}><X className="size-4" /></button>
          </header>
          <div className="relative min-h-0 flex-1" onPointerMove={trackPointer} onPointerEnter={() => glow.current?.style.setProperty("opacity", "1")} onPointerLeave={() => glow.current?.style.setProperty("opacity", "0")}>
            <div ref={dots} aria-hidden className="pointer-events-none absolute -inset-3 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:14px_14px] transition-[background-position] duration-200 ease-out" />
            <div ref={glow} aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [--mx:50%] [--my:40%] [background-image:radial-gradient(rgba(244,212,77,0.85)_1px,transparent_1.5px)] [background-size:14px_14px] [mask-image:radial-gradient(150px_circle_at_var(--mx)_var(--my),black,transparent)] [-webkit-mask-image:radial-gradient(150px_circle_at_var(--mx)_var(--my),black,transparent)]" />
            <div data-lenis-prevent className="absolute inset-0 overflow-y-auto overscroll-contain p-4">
              <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col">
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col justify-center gap-6 pb-6">
                    <div className="flex flex-col items-center gap-5">
                      <AssistantMark cell={full ? 14 : 12} />
                      <Greeting key={open ? "open" : "closed"} text={`${greeting()}${session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTIONS.map(({ icon: Icon, title: label, sub, prompt }, index) => (
                        <button key={label} type="button" onClick={() => send(prompt)} style={{ animationDelay: `${500 + index * 70}ms` }} className="asst-rise asst-motion group flex items-center gap-3 border border-white/10 bg-[#121212]/90 px-3 py-2.5 text-left transition duration-150 hover:-translate-y-px hover:border-[#f4d44d]/70 hover:bg-[#161616] active:translate-y-0 active:scale-[0.99]">
                          <span className="flex size-8 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] text-white/60 transition group-hover:text-[#f4d44d]"><Icon className="size-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-white">{label}</span><span className="block truncate text-[11px] text-white/50">{sub}</span></span>
                          <ChevronRight className="size-4 text-white/30 transition duration-150 group-hover:translate-x-0.5 group-hover:text-[#f4d44d]" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ol aria-live="polite" className="flex flex-col gap-4">
                    {messages.map((message, index) => {
                      if (message.kind === "user") return <li key={index} className="asst-rise max-w-[88%] self-end bg-[#232323] px-3 py-2 text-[12px] leading-5 text-white">{message.text}</li>;
                      if (message.kind === "result") return (
                        <li key={index} className={`asst-rise text-[12px] leading-5 ${message.ok ? "border-l-2 border-[#f4d44d] bg-[#0b0b0b]/70 px-3 py-1.5 text-white/80" : "border border-red-500/70 bg-red-950/60 p-3 text-red-100"}`}>
                          {!message.ok ? <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300"><ShieldAlert className="size-3.5" />{message.title ? "Didn't work" : "Something went wrong"}</p> : null}
                          {!message.ok && message.title ? <p className="mb-1 font-bold text-white">{message.title}</p> : null}
                          {message.text}
                          {message.secret ? (
                            <div className="mt-2 flex items-center gap-2 border border-white/15 bg-black/60 p-2">
                              <code className="min-w-0 flex-1 break-all text-[11px] text-[#f4d44d]">{message.secret}</code>
                              <button type="button" onClick={() => void copy(message.secret!)} aria-label="Copy" className="asst-motion flex size-7 shrink-0 items-center justify-center border border-white/20 transition hover:border-[#f4d44d] active:scale-90">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
                            </div>
                          ) : null}
                          {message.href ? <button type="button" onClick={() => router.push(message.href!)} className={`mt-2 block text-[11px] font-bold uppercase tracking-widest hover:underline ${message.ok ? "text-[#f4d44d]" : "text-white"}`}>{message.linkLabel ?? "Open"} →</button> : null}
                        </li>
                      );
                      const info = message.action ? describeAction(message.action) : null;
                      const danger = message.action ? TOOL_RISK[message.action.tool] === "danger" : false;
                      return (
                        <li key={index} className="asst-rise flex flex-col gap-2">
                          <div className="border border-white/10 bg-[#121212]/95 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#f4d44d]">Assistant</p>
                            <div className="mt-1.5">{message.thinking ? <Reasoning text={message.thinking} open={showReasoning} /> : null}</div>
                            <p className="whitespace-pre-wrap text-[12px] leading-5 text-white/90">{message.text}</p>
                          </div>
                          {info && message.action && TOOL_RISK[message.action.tool] !== "none" ? (
                            <div role="group" aria-label="Permission needed" className={`asst-pop border p-3 transition-opacity duration-300 ${danger ? "border-red-500/70 bg-red-950/60" : "border-[#f4d44d]/60 bg-[#1a1708]"} ${message.status === "denied" ? "opacity-50" : ""}`}>
                              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${danger ? "text-red-300" : "text-[#f4d44d]"}`}>{danger ? <ShieldAlert className="size-3.5" /> : <KeyRound className="size-3.5" />}{message.status === "pending" ? "Permission needed" : message.status === "running" ? "Working…" : message.status === "done" ? "Allowed" : message.status === "denied" ? "Not allowed" : "Didn't work"}</div>
                              <p className="mt-1.5 text-[12px] font-bold leading-5 text-white">{info.title}</p>
                              {info.detail ? <p className="mt-0.5 text-[11px] leading-5 text-white/60">{info.detail}</p> : null}
                              {message.status === "pending" ? (
                                <div className="mt-3 flex gap-2">
                                  <button type="button" onClick={() => decide(index, true)} className={`asst-motion h-8 px-3 text-[10px] font-bold uppercase tracking-widest transition duration-150 hover:-translate-y-px active:translate-y-0 active:scale-95 ${danger ? "bg-red-500 text-white hover:bg-red-400" : "bg-[#f4d44d] text-[#090909] hover:bg-[#fff4b5]"}`}>{info.confirmLabel}</button>
                                  <button type="button" onClick={() => decide(index, false)} className="asst-motion h-8 border border-white/25 px-3 text-[10px] uppercase tracking-widest text-white/75 transition duration-150 hover:border-white/60 active:scale-95">Not now</button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-1 px-1 text-white/35">
                            <button type="button" onClick={() => setRated((value) => ({ ...value, [index]: "up" }))} aria-label="Good answer" className={`asst-motion flex size-6 items-center justify-center transition hover:text-white active:scale-75 ${rated[index] === "up" ? "text-[#f4d44d]" : ""}`}><ThumbsUp className="size-3.5" /></button>
                            <button type="button" onClick={() => setRated((value) => ({ ...value, [index]: "down" }))} aria-label="Bad answer" className={`asst-motion flex size-6 items-center justify-center transition hover:text-white active:scale-75 ${rated[index] === "down" ? "text-red-400" : ""}`}><ThumbsDown className="size-3.5" /></button>
                            <button type="button" onClick={() => void copy(message.text)} aria-label="Copy answer" className="asst-motion flex size-6 items-center justify-center transition hover:text-white active:scale-75"><Copy className="size-3.5" /></button>
                          </div>
                        </li>
                      );
                    })}
                    {busy && (live || liveThinking) ? (
                      <li className="flex flex-col gap-2">
                        <div className="border border-white/10 bg-[#121212]/95 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#f4d44d]">Assistant</p>
                          <div className="mt-1.5">{liveThinking ? <Reasoning text={liveThinking} open={showReasoning} live={!live} /> : null}</div>
                          {live ? <p className="whitespace-pre-wrap text-[12px] leading-5 text-white/90">{live}<span aria-hidden className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#f4d44d] align-middle" /></p> : null}
                        </div>
                      </li>
                    ) : busy ? (
                      <li className="asst-rise flex items-center gap-3 text-[12px] italic text-white/55"><AssistantMark cell={3} busy />Composing your answer…</li>
                    ) : null}
                  </ol>
                )}
                <div ref={end} />
              </div>
            </div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); send(draft); }} className="relative z-10 shrink-0 p-3">
            <div className="mx-auto w-full max-w-[720px]">
              {menu ? (
                <div className="asst-pop absolute bottom-[calc(100%-8px)] right-3 z-10 w-72 origin-bottom-right border border-white/15 bg-[#151515] p-1 shadow-xl">
                  <div className="flex items-start gap-2 px-3 py-2">{readOnly ? <Globe2 className="mt-0.5 size-4 text-white/60" /> : <ShieldCheck className="mt-0.5 size-4 text-[#f4d44d]" />}<div><p className="text-[12px] font-bold text-white">{readOnly ? "Read only" : "Can act, asks first"}</p><p className="text-[11px] leading-4 text-white/55">{readOnly ? "I can look and open pages, but I can't change anything." : "I can change things in your account, but only after you click Allow."}</p></div></div>
                  <button type="button" onClick={() => { setReadOnly((value) => !value); setMenu(false); }} className="w-full px-3 py-2 text-left text-[12px] text-white/80 transition hover:bg-white/10">{readOnly ? "Let me act (ask first)" : "Switch to read only"}</button>
                  <button type="button" onClick={() => setShowReasoning((value) => !value)} role="switch" aria-checked={showReasoning} className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-white/80 transition hover:bg-white/10">Show reasoning<span className={`h-4 w-7 p-0.5 transition-colors ${showReasoning ? "bg-[#f4d44d]" : "bg-white/20"}`}><span className={`block size-3 transition-transform duration-150 ${showReasoning ? "translate-x-3 bg-[#090909]" : "bg-white"}`} /></span></button>
                </div>
              ) : null}
              <div className="border border-white/15 bg-[#121212] transition-colors duration-200 focus-within:border-[#f4d44d]/70">
                <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
                <input ref={input} id="assistant-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Tell me what to do, or ask anything" autoComplete="off" className="h-11 w-full bg-transparent px-3 text-[12px] text-white outline-none placeholder:text-white/35" />
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="flex items-center gap-1.5 bg-white/[0.05] px-2 py-1 text-[10px] uppercase tracking-widest text-white/60">{readOnly ? "Ask" : "Do"}</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setMenu((value) => !value)} aria-label="Permissions" aria-expanded={menu} title="Permissions" className={`asst-motion flex size-8 items-center justify-center transition hover:bg-white/10 active:scale-90 ${readOnly ? "text-white/50" : "text-[#f4d44d]"}`}><ShieldCheck className="size-4" /></button>
                    <button type="submit" disabled={busy || !draft.trim()} aria-label={busy ? "Working" : "Send"} className="asst-motion flex size-8 items-center justify-center bg-[#f4d44d] text-[#090909] transition duration-150 hover:bg-[#fff4b5] active:scale-90 disabled:opacity-40">{busy ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4" />}</button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-white/35">AI can be wrong. It only acts after you say yes. Chats stay in this browser. Ctrl+J opens and closes this.</p>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
