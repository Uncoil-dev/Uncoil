"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Copy, Plus, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectCreateError } from "@/lib/project-errors";

export function CreateProjectModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const createProject = useMutation(api.projects.createProject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createProject({
        name: name.trim(),
      });
      
      setApiKey(result.apiKey);
    } catch (err) {
      setError(projectCreateError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setName("");
        setApiKey(null);
        setCopied(false);
        setError("");
      }, 200);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          children ? (
            React.isValidElement(children) ? (
              children
            ) : (
              <span>{children}</span>
            )
          ) : (
            <Button className="font-mono uppercase h-9 px-4">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px] border-black/15 bg-white rounded-none">
        {!apiKey ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="space-y-3">
              <DialogTitle className="font-mono uppercase text-xl text-black">Create Project</DialogTitle>
              <DialogDescription className="text-black/55 font-sans">
                Create a new observability project to get your SDK API key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-8">
              <div className="flex flex-col gap-3">
                <label htmlFor="name" className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/55">
                  Project Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Agent"
                  autoComplete="off"
                  autoFocus
                  className="bg-white border-black/15 rounded-none h-10 font-mono text-black focus-visible:ring-white/20 transition-all"
                />
              </div>
              {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="w-full h-10 font-mono uppercase"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 space-y-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-none bg-black text-white flex items-center justify-center animate-in zoom-in duration-500 ease-[0.23,1,0.32,1]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-mono font-bold tracking-tight text-xl text-black uppercase">Project Created</h3>
                <p className="text-sm text-black/55 font-sans px-4">
                  Copy your API key now. You will not be able to see it again.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="relative flex items-center justify-between p-4 rounded-none border border-black/15 bg-white font-mono text-sm group-hover:border-black/25 transition-colors">
                <span className="truncate mr-4 text-black uppercase tracking-tighter">{apiKey}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0 h-8 px-3 font-mono text-[10px] uppercase bg-[#f3f2ed] hover:bg-black hover:text-white transition-all"
                >
                  {copied ? "Copied" : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="w-full h-10 font-mono uppercase border-black/15 hover:bg-black hover:text-white"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
