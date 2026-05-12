"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import type { ThreadMessage } from "@assistant-ui/core";
import { HttpAgent } from "@ag-ui/client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { PremiumHitlToolUIs } from "@/components/premium/tools/PremiumHitlToolUIs";
import { agentApiPathFromPathname } from "@/lib/demo-agent";
import { getBackendBase } from "@/lib/backend-url";
import { useAgUiRuntimeWithSuggestions } from "@/lib/useAgUiRuntimeWithSuggestions";

function findLastAssistantText(messages: readonly ThreadMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === "assistant") {
      return getThreadMessageText(m).trim();
    }
  }
  return "";
}

export function AgUiRuntimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/demo/streaming";
  const backend = getBackendBase();
  const apiPath = agentApiPathFromPathname(pathname);

  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${backend.replace(/\/$/, "")}${apiPath}`,
      }),
    [backend, apiPath],
  );

  const suggestionGenerate = useMemo(
    () => async ({ messages }: { messages: readonly ThreadMessage[] }) => {
      const last = findLastAssistantText(messages);
      if (!last) return [];

      const res = await fetch(`${backend.replace(/\/$/, "")}/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_message: last.slice(0, 2000) }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { prompt?: string }[];
      if (!Array.isArray(data)) return [];
      return data
        .filter((x) => x && typeof x.prompt === "string" && x.prompt.trim())
        .map((x) => ({ prompt: x.prompt!.trim() }));
    },
    [backend],
  );

  const runtime = useAgUiRuntimeWithSuggestions({
    agent,
    showThinking: true,
    suggestionGenerate,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PremiumHitlToolUIs />
      {children}
    </AssistantRuntimeProvider>
  );
}
