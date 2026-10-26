"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { setOneTimeApiKey } from "@/lib/onboarding-client-state";

const API_KEY_COPIED_STORAGE_KEY = "tracify.onboarding.apiKeyCopied";
const PROJECT_ID_STORAGE_KEY = "tracify.onboarding.projectId";
const PROJECT_NAME_STORAGE_KEY = "tracify.onboarding.projectName";
const LAST_PROJECT_STORAGE_KEY = "tracify.lastProjectId";

const STEPS = [
  ["1", "Create a project", "One click. It holds your traces, costs and alerts."],
  ["2", "Copy your key", "Shown once, so you can paste it into your agent."],
  ["3", "Send a trace", "Add two lines of code and your first run shows up here."],
];

/** Start screen for a signed-in account with no project: one button makes a project and goes to the key step. */
export function NoProjectStart() {
  const router = useRouter();
  const createProject = useMutation(api.projects.createProject);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await createProject({ name: "my-first-project" });
      setOneTimeApiKey(result.plaintextApiKey);
      window.sessionStorage.removeItem(API_KEY_COPIED_STORAGE_KEY);
      window.sessionStorage.setItem(PROJECT_ID_STORAGE_KEY, result.projectId);
      window.sessionStorage.setItem(PROJECT_NAME_STORAGE_KEY, result.name);
      window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, result.projectId);
      router.push("/onboarding/api-key");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl flex-col justify-center px-4 py-12" data-testid="no-project-start">
      <div className="border border-black bg-[#090909] p-8 text-[#eceae3] md:p-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f4d44d]">Welcome to Tracify</p>
        <h1 className="mt-3 font-mono text-3xl normal-case tracking-normal md:text-4xl">See what your AI agent really did.</h1>
        <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-[#eceae3]/70">
          Start with a project. It takes one click, and you can rename it any time.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button type="button" onClick={create} disabled={busy} className="h-12 bg-[#f4d44d] px-6 uppercase text-[#090909] hover:bg-[#fff4b5]">
            {busy ? "Creating..." : "Create my project →"}
          </Button>
          <Link href="/onboarding/project" className="font-mono text-[11px] text-[#eceae3]/60 underline-offset-4 hover:text-[#eceae3] hover:underline">
            I want to pick a name
          </Link>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-[#ff8a8a]">{error}</p> : null}
      </div>
      <ol className="mt-4 grid gap-px border border-black/15 bg-black/15 md:grid-cols-3">
        {STEPS.map(([n, title, body]) => (
          <li key={n} className="bg-white p-5">
            <span className="font-mono text-[11px] text-black/50">{n}</span>
            <p className="mt-2 font-mono text-sm text-black">{title}</p>
            <p className="mt-1 font-sans text-xs leading-5 text-black/60">{body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
