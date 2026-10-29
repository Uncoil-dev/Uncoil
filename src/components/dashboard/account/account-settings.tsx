"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, LogOut, Monitor, ShieldCheck, UserRound, Bell, Gauge } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { UsageTab } from "@/components/dashboard/account/usage-tab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile", blurb: "Name and sign-in email", icon: UserRound },
  { id: "security", label: "Password", blurb: "Change how you sign in", icon: KeyRound },
  { id: "usage", label: "Usage", blurb: "Spans used this month", icon: Gauge },
  { id: "sessions", label: "Devices", blurb: "Where you are signed in", icon: Monitor },
  { id: "email", label: "Email", blurb: "What we may send you", icon: Bell },
] as const;
type TabId = (typeof TABS)[number]["id"];

const field =
  "h-10 w-full border border-[#262C35] bg-[#0B0D10] px-3 font-mono text-sm text-[#E6E9EE] outline-none placeholder:text-[#59616B] focus:border-[#F4D44D] disabled:opacity-60";
const primary =
  "inline-flex h-10 items-center justify-center gap-2 bg-[#F4D44D] px-5 font-mono text-xs uppercase tracking-widest !text-[#090909] transition-opacity hover:opacity-90 disabled:opacity-50";
const ghost =
  "inline-flex h-9 items-center justify-center gap-2 border border-[#262C35] px-4 font-mono text-[11px] uppercase tracking-widest !text-[#E6E9EE] transition-colors hover:border-[#F4D44D] disabled:opacity-50";

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="border border-[#1F242C] bg-[#0E1115]">
      <header className="border-b border-[#1F242C] px-6 py-5">
        <h2 className="font-mono text-base text-[#E6E9EE]">{title}</h2>
        <p className="mt-1 font-sans text-[13px] text-[#8B93A1]">{text}</p>
      </header>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("font-mono text-xs", tone === "ok" ? "text-[#5BE3A0]" : "text-[#FF8A8A]")}>
      {children}
    </p>
  );
}

/** Centre-crops a picked image to a small square and returns it as a data URL (a few KB, stored on the user). */
async function squareAvatar(file: File, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize pictures.");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

function Profile() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [edited, setEdited] = useState(false);
  const shownName = edited ? name : (user?.name ?? "");

  async function changePicture(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote({ tone: "error", text: "Pick an image file (PNG, JPG or WebP)." });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await authClient.updateUser({ image: await squareAvatar(file) });
      setNote(result.error ? { tone: "error", text: result.error.message ?? "Could not save the picture." } : { tone: "ok", text: "Picture updated." });
    } catch {
      setNote({ tone: "error", text: "That picture could not be read. Try another one." });
    }
    setBusy(false);
  }

  async function removePicture() {
    setBusy(true);
    setNote(null);
    const result = await authClient.updateUser({ image: null });
    setBusy(false);
    setNote(result.error ? { tone: "error", text: result.error.message ?? "Could not remove the picture." } : { tone: "ok", text: "Picture removed." });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote(null);
    const result = await authClient.updateUser({ name: shownName.trim() });
    setBusy(false);
    setNote(result.error ? { tone: "error", text: result.error.message ?? "Could not save." } : { tone: "ok", text: "Saved." });
  }

  return (
    <Panel title="Profile" text="This is how you appear to teammates in your projects.">
      {isPending ? (
        <p className="font-mono text-sm text-[#8B93A1]">Loading…</p>
      ) : (
        <form onSubmit={save} className="grid max-w-xl gap-5">
          <div className="flex items-center gap-4">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="Your profile picture" width={56} height={56} referrerPolicy="no-referrer" className="block size-14 shrink-0 object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center bg-[#F4D44D] font-mono text-2xl font-semibold text-[#090909]">
                {(user?.name || user?.email || "T").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate font-mono text-sm text-[#E6E9EE]">{user?.name || "No name yet"}</div>
              <div className="truncate font-mono text-xs text-[#8B93A1]">{user?.email}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className={cn(ghost, "cursor-pointer", busy && "pointer-events-none opacity-50")}>
                  {user?.image ? "Change picture" : "Upload picture"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(e) => { void changePicture(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {user?.image ? <button type="button" className={ghost} disabled={busy} onClick={() => void removePicture()}>Remove</button> : null}
              </div>
            </div>
          </div>
          <label className="grid gap-2 font-mono text-[11px] uppercase tracking-widest text-[#8B93A1]">
            Name
            <input className={field} value={shownName} onChange={(e) => { setEdited(true); setName(e.target.value); }} maxLength={80} placeholder="Your name" />
          </label>
          <label className="grid gap-2 font-mono text-[11px] uppercase tracking-widest text-[#8B93A1]">
            Email
            <input className={field} value={user?.email ?? ""} disabled readOnly />
            <span className="normal-case tracking-normal text-[#6B7380]">
              {user?.emailVerified ? "Verified." : "Not verified yet."} To change your email, contact support.
            </span>
          </label>
          <div className="flex items-center gap-4">
            <button type="submit" className={primary} disabled={busy || !shownName.trim() || shownName.trim() === (user?.name ?? "")}>
              {busy ? "Saving…" : "Save"}
            </button>
            {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
          </div>
        </form>
      )}
    </Panel>
  );
}

function Password() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (next.length < 8) return setNote({ tone: "error", text: "Use at least 8 characters." });
    setBusy(true);
    setNote(null);
    const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (result.error) return setNote({ tone: "error", text: result.error.message ?? "Could not change password." });
    setCurrent("");
    setNext("");
    setNote({ tone: "ok", text: "Password changed. Other devices were signed out." });
  }

  return (
    <Panel title="Password" text="Changing it signs you out everywhere else.">
      <form onSubmit={save} className="grid max-w-xl gap-5">
        <label className="grid gap-2 font-mono text-[11px] uppercase tracking-widest text-[#8B93A1]">
          Current password
          <input className={field} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="grid gap-2 font-mono text-[11px] uppercase tracking-widest text-[#8B93A1]">
          New password
          <input className={field} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <div className="flex items-center gap-4">
          <button type="submit" className={primary} disabled={busy || !current || !next}>
            {busy ? "Changing…" : "Change password"}
          </button>
          {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
        </div>
      </form>
    </Panel>
  );
}

type SessionRow = { token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string };

function describe(agent?: string | null) {
  if (!agent) return "Unknown device";
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const os = /Windows/.test(agent) ? "Windows" : /Mac OS/.test(agent) ? "macOS" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Linux/.test(agent) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function Devices() {
  const { data: session } = authClient.useSession();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const result = await authClient.listSessions();
    if (result.error) return setError(result.error.message ?? "Could not load devices.");
    setRows(result.data as SessionRow[]);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void authClient.listSessions().then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error.message ?? "Could not load devices.");
      else setRows(result.data as SessionRow[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const currentToken = session?.session?.token;

  async function revoke(token: string) {
    await authClient.revokeSession({ token });
    await load();
  }
  async function revokeOthers() {
    await authClient.revokeOtherSessions();
    await load();
  }

  return (
    <Panel title="Devices" text="Browsers and computers that are currently signed in to your account.">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {rows === null && !error ? <p className="font-mono text-sm text-[#8B93A1]">Loading…</p> : null}
      <ul className="divide-y divide-[#1F242C] border border-[#1F242C]">
        {(rows ?? []).map((row) => {
          const isCurrent = row.token === currentToken;
          return (
            <li key={row.token} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Monitor className="size-4 text-[#8B93A1]" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-[#E6E9EE]">
                  {describe(row.userAgent)}
                  {isCurrent ? <span className="ml-2 bg-[#F4D44D] px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-[#090909]">This device</span> : null}
                </div>
                <div className="font-mono text-[11px] text-[#6B7380]">
                  {row.ipAddress ? `${row.ipAddress} · ` : ""}signed in {new Date(row.createdAt).toLocaleString()}
                </div>
              </div>
              {isCurrent ? null : (
                <button type="button" className={ghost} onClick={() => void revoke(row.token)}>
                  Sign out
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {rows && rows.length > 1 ? (
        <button type="button" className={cn(ghost, "mt-4")} onClick={() => void revokeOthers()}>
          Sign out all other devices
        </button>
      ) : null}
    </Panel>
  );
}

function EmailPrefs() {
  const remote = useQuery(api.notificationPreferences.get, {});
  const saveRemote = useMutation(api.notificationPreferences.set);
  const [local, setLocal] = useState<{ operational: boolean; product: boolean }>({ operational: true, product: false });
  const value = remote ? { operational: remote.operational, product: remote.product } : local;
  function save(next: { operational: boolean; product: boolean }) {
    setLocal(next);
    void saveRemote(next);
  }
  const rows = [
    { key: "operational" as const, title: "Setup help", text: "Welcome, setup, first-trace and important account messages." },
    { key: "product" as const, title: "Product updates", text: "Occasional feature and release notes." },
  ];
  return (
    <Panel title="Email" text="Choose which emails you get from Uncoil.">
      <ul className="divide-y divide-[#1F242C] border border-[#1F242C]">
        {rows.map((row) => (
          <li key={row.key}>
            <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4">
              <span>
                <span className="block font-mono text-sm text-[#E6E9EE]">{row.title}</span>
                <span className="block font-sans text-[13px] text-[#8B93A1]">{row.text}</span>
              </span>
              <input
                type="checkbox"
                className="size-4 accent-[#F4D44D]"
                checked={value[row.key]}
                onChange={(e) => save({ ...value, [row.key]: e.target.checked })}
              />
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className={cn(ghost, "mt-4")} onClick={() => window.dispatchEvent(new Event("uncoil:open-consent"))}>
        <ShieldCheck className="size-3.5" /> Cookie and privacy choices
      </button>
    </Panel>
  );
}

function useBackHref() {
  const last = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.localStorage.getItem("uncoil.lastProjectId");
      } catch {
        return null;
      }
    },
    () => null,
  );
  return last ? `/dashboard/${last}` : "/dashboard";
}

export function AccountSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = useBackHref();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const requested = searchParams.get("tab");
  const active: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "profile";

  return (
    <div className="min-h-svh bg-[#0B0D10] font-mono text-[#E6E9EE] md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-[#1F242C] bg-[#050505] md:sticky md:top-0 md:h-svh md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href={backHref} className="inline-flex items-center gap-2 text-[12px] !text-[#8B93A1] hover:!text-[#F4D44D]">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/uncoil/uncoil-name-on-dark.svg" alt="uncoil" height={20} className="block h-5 w-auto md:mt-6" />
        </div>
        <div className="hidden items-center gap-3 border-y border-[#1F242C] px-5 py-4 md:flex">
          <span className="flex size-10 shrink-0 items-center justify-center bg-[#F4D44D] text-base font-semibold text-[#090909]">
            {(user?.name || user?.email || "T").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm">{user?.name || "Your account"}</div>
            <div className="truncate text-[11px] text-[#6B7380]">{user?.email}</div>
          </div>
        </div>
        <nav aria-label="Account sections" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-visible md:py-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const on = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => router.replace(`/dashboard/account?tab=${tab.id}`, { scroll: false })}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors",
                  on ? "bg-[#111418] text-[#E6E9EE] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#F4D44D]" : "text-[#8B93A1] hover:bg-[#0E1115] hover:text-[#E6E9EE]",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex flex-col">
                  {tab.label}
                  <span className="hidden text-[10px] text-[#6B7380] md:block">{tab.blurb}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
          className="hidden items-center gap-3 border-t border-[#1F242C] px-5 py-4 text-[13px] text-[#FF8A8A] hover:bg-[#0E1115] md:flex"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>
      <main className="min-w-0 px-4 pb-16 pt-8 sm:px-8 md:pt-12">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl">{TABS.find((t) => t.id === active)?.label}</h1>
          <p className="mb-6 mt-1 font-sans text-sm text-[#8B93A1]">Account settings follow you across every project.</p>
          {active === "profile" ? <Profile /> : null}
          {active === "security" ? <Password /> : null}
          {active === "usage" ? <UsageTab /> : null}
          {active === "sessions" ? <Devices /> : null}
          {active === "email" ? <EmailPrefs /> : null}
          <button
            type="button"
            onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            className={cn(ghost, "mt-8 !text-[#FF8A8A] md:hidden")}
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
