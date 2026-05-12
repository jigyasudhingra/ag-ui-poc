"use client";

import { ThreadPrimitive } from "@assistant-ui/react";

const SUGGESTIONS = [
  "Search latest AI news",
  "Calculate compound interest",
  "Convert 180 lbs to kg",
  "What day is Dec 25, 2026?",
];

export function WelcomeScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 py-16">
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-blue-600/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/30 to-blue-800/30">
          <span className="text-2xl">✦</span>
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-zinc-100">
          What can I help with?
        </h2>
        <p className="max-w-xs text-sm text-zinc-500">
          Powered by Pydantic AI with web search, calculations, MCP tools and
          more.
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        {SUGGESTIONS.map((s) => (
          <ThreadPrimitive.Suggestion
            key={s}
            prompt={s}
            className="cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-xs text-zinc-400 transition-all hover:bg-white/[0.05] hover:text-zinc-200"
          />
        ))}
      </div>
    </div>
  );
}
