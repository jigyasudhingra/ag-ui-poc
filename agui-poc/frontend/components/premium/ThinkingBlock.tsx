"use client";

import { useMessage } from "@assistant-ui/react";
import { useEffect, useState } from "react";

/** Collapsible wrapper for grouped reasoning + tool-call sections. */
export function ThinkingBlockShell({ children }: { children: React.ReactNode }) {
  const isRunning = useMessage((m) => m.status?.type === "running");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!isRunning) {
      const t = window.setTimeout(() => setOpen(false), 800);
      return () => window.clearTimeout(t);
    }
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [isRunning]);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f11]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        {isRunning ? (
          <>
            <span
              className="h-3 w-3 shrink-0 rounded-full border-2 border-amber-400/60 border-t-transparent animate-spin"
              aria-hidden
            />
            <span className="font-medium text-amber-400/80">Thinking…</span>
          </>
        ) : (
          <>
            <span className="text-emerald-500" aria-hidden>
              ✓
            </span>
            <span className="font-medium text-zinc-400">Thought process</span>
          </>
        )}
        <span className="ml-auto font-mono text-[10px] text-zinc-700">
          {open ? "Hide" : "Show"}
        </span>
        <span
          className={`text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ⌄
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-white/[0.04] px-4 pb-4 pt-2 text-xs text-zinc-600">
          {children}
        </div>
      ) : null}
    </div>
  );
}
