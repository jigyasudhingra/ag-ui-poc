"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AgUiRuntimeProvider } from "@/components/AgUiRuntimeProvider";
import { PremiumThread } from "@/components/premium/PremiumThread";
import {
  agentIdFromPath,
  demoSegmentFromPath,
  demoTitles,
  usesLegacyCopilotSidebar,
} from "@/lib/demo-agent";

import { HitlTools } from "@/components/HitlTools";
import { ThinkingPanel } from "@/components/ThinkingPanel";
import { ToolCallRenderer } from "@/components/ToolCallRenderer";

const NAV = [
  { href: "/demo/streaming", label: "UC1 Streaming" },
  { href: "/demo/genui", label: "UC2 Generative UI" },
  { href: "/demo/hitl", label: "UC3 HITL" },
  { href: "/demo/frontend-tools", label: "UC4 Frontend tools" },
  { href: "/demo/shared-state", label: "UC5 Shared state" },
  { href: "/demo/context", label: "UC6 Context" },
  { href: "/demo/multi-step", label: "UC7 Multi-step" },
  { href: "/demo/mcp", label: "UC8 MCP" },
] as const;

const SNIPPETS: Record<string, string> = {
  streaming:
    "Try: “What is the AG-UI protocol and why does it matter for agentic frontends?”",
  genui:
    'Try tables/math, or HITL: draft email to team@example.com, ask for a missing date, or delete /tmp/demo.log (simulate).',
  hitl: "Try: “Generate 5 UUIDs and save them.” Approve or cancel in-chat.",
  "frontend-tools":
    "Try: “Take me to the shared state demo.” or “Highlight the navigation sidebar.”",
  "shared-state":
    "Try: “Show me Q1 revenue, calculate the 10% growth target, filter the table to 2024.”",
  context: "Try: “Summarize what you can see right now.”",
  "multi-step":
    "Try: “Search BTC price, calculate what 0.35 BTC is worth, show a breakdown table.”",
  mcp: "Try: “What’s the BTC funding rate and price?” (MCP crypto tools + calculators)",
};

export function DemoProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/demo/streaming";
  const segment = demoSegmentFromPath(pathname);
  const agentId = agentIdFromPath(pathname);
  const multi = segment === "multi-step";
  const legacyChat = usesLegacyCopilotSidebar(segment);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent={agentId}>
      {legacyChat ? <ToolCallRenderer /> : null}
      {segment === "hitl" ? <HitlTools /> : null}
      <div className="flex min-h-full flex-1">
        <nav className="agent-highlight-target w-56 shrink-0 border-r border-zinc-800/80 bg-[var(--surface)]/90 p-3">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            AG-UI POC
          </div>
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-zinc-800 ${
                    pathname === item.href
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-800 px-6 py-4">
            <h1 className="text-lg font-semibold text-zinc-100">
              {demoTitles(segment)}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {SNIPPETS[segment] ?? ""}
            </p>
          </header>
          <div className="flex min-h-0 flex-1">
            {!legacyChat ? (
              <AgUiRuntimeProvider>
                <main className="min-h-0 flex-1 space-y-4 overflow-auto px-6 py-4">
                  {children}
                </main>
                <aside className="flex w-[min(420px,40vw)] shrink-0 flex-col border-l border-[var(--surface-border)] bg-[var(--background)]">
                  <PremiumThread />
                </aside>
              </AgUiRuntimeProvider>
            ) : (
              <main className="min-h-0 flex-1 space-y-4 overflow-auto px-6 py-4">
                {children}
              </main>
            )}
          </div>
          {multi ? (
            <div className="space-y-2 border-t border-zinc-800 px-6 py-3">
              <ThinkingPanel />
            </div>
          ) : null}
        </div>
      </div>
      {legacyChat ? (
        <CopilotSidebar
          defaultOpen
          labels={{
            title: "Copilot",
            initial: SNIPPETS[segment] ?? "Ask anything…",
            placeholder: "Message…",
          }}
        />
      ) : null}
    </CopilotKit>
  );
}
