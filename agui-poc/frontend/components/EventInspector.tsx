"use client";

import { useCopilotChat } from "@copilotkit/react-core";
import { useMemo } from "react";

export function EventInspector() {
  const { visibleMessages: vm } = useCopilotChat();
  const visibleMessages = useMemo(() => vm ?? [], [vm]);

  const lines = useMemo(() => {
    const payload = JSON.stringify(visibleMessages as unknown[], null, 2);
    const parts = payload.split("\n");
    return parts.length > 400 ? parts.slice(-400) : parts;
  }, [visibleMessages]);

  return (
    <aside className="fixed bottom-30 right-100 z-40 w-[min(100vw-2rem,420px)] max-h-[55vh] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/95 shadow-2xl backdrop-blur">
      <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Chat snapshot (debug)
      </div>
      <pre className="max-h-[calc(55vh-3rem)] overflow-auto p-3 text-[10px] leading-snug text-emerald-300/90">
        {lines.join("\n")}
      </pre>
    </aside>
  );
}
