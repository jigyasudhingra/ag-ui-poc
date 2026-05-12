"use client";

import { ThreadPrimitive, useMessage } from "@assistant-ui/react";

export function FollowUpSuggestions() {
  const isLast = useMessage((m) => m.isLast);
  const role = useMessage((m) => m.role);

  if (!isLast || role !== "assistant") return null;

  return (
    <div className="mt-4">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
        Related
      </p>
      <div className="flex flex-wrap gap-2">
        <ThreadPrimitive.Suggestions>
          {({ suggestion }) => (
            <ThreadPrimitive.Suggestion
              prompt={suggestion.prompt}
              send={false}
              className="group flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.06] px-3 py-1.5 text-xs text-zinc-500 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-zinc-200"
            >
              <span className="text-zinc-700 transition-colors group-hover:text-zinc-500">
                ›
              </span>
              {suggestion.prompt}
            </ThreadPrimitive.Suggestion>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
}
