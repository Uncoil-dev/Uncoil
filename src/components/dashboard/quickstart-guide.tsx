"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal, Code2, BookOpen, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scoreSnippet } from "@/lib/score-snippets";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

interface QuickstartGuideProps {
  projectId: string;
}

export function QuickstartGuide({ projectId }: QuickstartGuideProps) {
  const region = getUncoilRegion(getDeploymentRegion());
  const project = useQuery(
    api.projects.getProjectById,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const pythonCode = `from uncoil import trace_agent, llm_call

@trace_agent()
async def run_my_agent():
    llm_call(
        input_data="What is Uncoil?",
        output_data="Observability for AI agents.",
        model_id="gpt-4o",
        cost_usd=0.002,
        latency_ms=450
    )
    return "Success"`;

  const tsCode = `import { traceAgent, llmCall } from 'uncoil-sdk';

const runAgent = traceAgent(async () => {
  await llmCall({
    input: "What is Uncoil?",
    output: "Observability for AI agents.",
    modelId: "gpt-4o",
    costUsd: 0.002,
    latencyMs: 450
  });
  return "Success";
});`;

  const scorePy = scoreSnippet("python", projectId);
  const scoreTs = scoreSnippet("typescript", projectId);

  const installPy = "pip install uncoil-sdk";
  const installTs = "npm install uncoil-sdk";

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h2 className="font-mono text-lg text-black uppercase tracking-widest">Instrumentation</h2>
        <p className="text-sm text-black/55 font-sans">
          Connect your agent to Uncoil in less than 5 minutes.
        </p>
      </div>

      <Tabs defaultValue="python" className="w-full">
        <TabsList className="bg-white border border-border rounded-none p-1 h-12">
          <TabsTrigger
            value="python"
            className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white font-mono text-xs uppercase max-sm:h-10 max-sm:px-4"
          >
            Python
          </TabsTrigger>
          <TabsTrigger
            value="typescript"
            className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white font-mono text-xs uppercase max-sm:h-10 max-sm:px-4"
          >
            TypeScript
          </TabsTrigger>
        </TabsList>

        <TabsContent value="python" className="space-y-6 mt-6">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
              <Terminal className="size-4" /> 1. Install Library
            </h3>
            <CodeBlock code={installPy} onCopy={() => copyToClipboard(installPy, 'py-install')} copied={copied === 'py-install'} />
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
              <Code2 className="size-4" /> 2. Instrument Agent
            </h3>
            <CodeBlock code={pythonCode} onCopy={() => copyToClipboard(pythonCode, 'py-code')} copied={copied === 'py-code'} language="python" />
          </section>
        </TabsContent>

        <TabsContent value="typescript" className="space-y-6 mt-6">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
              <Terminal className="size-4" /> 1. Install Library
            </h3>
            <CodeBlock code={installTs} onCopy={() => copyToClipboard(installTs, 'ts-install')} copied={copied === 'ts-install'} />
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
              <Code2 className="size-4" /> 2. Instrument Agent
            </h3>
            <CodeBlock code={tsCode} onCopy={() => copyToClipboard(tsCode, 'ts-code')} copied={copied === 'ts-code'} language="typescript" />
          </section>
        </TabsContent>
      </Tabs>

      <section className="space-y-4 pt-6">
        <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
          <KeyRound className="size-4" /> 3. Set Environment Variable
        </h3>
        <p className="text-[11px] text-black/55 font-mono">
          Inject your API key into your agent&apos;s environment.
        </p>
        <CodeBlock
          code={`UNCOIL_API_KEY=${project?.apiKeyPrefix || `uncoil_sk_live_${region.id}_`}••••••••${project?.apiKeyLast4 || '••••'}\nUNCOIL_REGION=${region.id}`}
          onCopy={() => copyToClipboard(`UNCOIL_API_KEY=YOUR_API_KEY\nUNCOIL_REGION=${region.id}`, 'env')}
          copied={copied === 'env'}
        />
      </section>

      <section className="space-y-4 pt-6">
        <h3 className="flex items-center gap-2 font-mono text-xs text-black/60 uppercase">
          <Check className="size-4" /> 4. Grade your own runs (optional)
        </h3>
        <p className="text-[11px] text-black/55 font-mono">
          Let your agent score each run from code. Scores appear on the Scores page with no copy-pasting.
        </p>
        <CodeBlock code={scorePy} onCopy={() => copyToClipboard(scorePy, 'score-py')} copied={copied === 'score-py'} language="python" />
        <CodeBlock code={scoreTs} onCopy={() => copyToClipboard(scoreTs, 'score-ts')} copied={copied === 'score-ts'} language="typescript" />
      </section>

      <div className="pt-10 flex gap-4">
        <Link
          href="/docs/quickstart"
          className="inline-flex h-9 items-center justify-center gap-2 border border-black/15 px-4 font-mono text-[10px] uppercase transition-colors hover:border-black hover:bg-black hover:text-white"
        >
          <BookOpen className="size-4" /> Full Documentation
        </Link>
      </div>
    </div>
  );
}

function CodeBlock({ code, onCopy, copied, language }: { code: string, onCopy: () => void, copied: boolean, language?: string }) {
  return (
    <div className="group relative">
      <pre className="p-4 bg-[#050505] border border-black text-[12px] max-sm:pr-12 font-mono text-[#f4d44d] overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCopy}
        className="absolute right-2 top-2 size-8 bg-black/50 border border-black/15 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity"
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-black/55" />}
      </Button>
      {language && (
        <span className="absolute left-4 -top-2.5 px-2 bg-white border border-border text-[9px] font-mono uppercase text-black/55">
          {language}
        </span>
      )}
    </div>
  );
}
