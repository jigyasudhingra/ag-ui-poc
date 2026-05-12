"use client";

import { MessagePartComponent } from "@assistant-ui/core/react";
import type { PartState } from "@assistant-ui/core/react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import { AssistantMarkdownText } from "@/components/premium/AssistantMarkdownText";
import { FollowUpSuggestions } from "@/components/premium/FollowUpSuggestions";
import { premiumToolComponents } from "@/components/premium/PremiumToolParts";
import { ThinkingBlockShell } from "@/components/premium/ThinkingBlock";
import { WelcomeScreen } from "@/components/premium/WelcomeScreen";

const chainGroupBy = (part: PartState) =>
  part.type === "reasoning" || part.type === "tool-call"
    ? (["group-thought"] as const)
    : null;

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group flex justify-end gap-3">
      <div className="max-w-[75%] space-y-1">
        <div className="rounded-2xl rounded-tr-sm border border-[var(--accent-border)] bg-[var(--user-bubble)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)]">
          <MessagePrimitive.Parts
            components={{
              Text: () => (
                <p className="whitespace-pre-wrap">
                  <MessagePartPrimitive.Text />
                </p>
              ),
            }}
          />
        </div>
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ActionBarPrimitive.Edit className="rounded px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">
            Edit
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--surface-border)] bg-zinc-800 text-xs text-zinc-400">
        ✦
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <MessagePrimitive.GroupedParts groupBy={chainGroupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-thought":
                return <ThinkingBlockShell>{children}</ThinkingBlockShell>;
              case "text":
                return <AssistantMarkdownText />;
              case "reasoning":
                return (
                  <div className="my-1 border-l-2 border-zinc-800 pl-3 text-xs italic leading-relaxed text-zinc-600">
                    {part.text}
                  </div>
                );
              case "tool-call":
                return (
                  <MessagePartComponent
                    components={{ tools: premiumToolComponents }}
                  />
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ActionBarPrimitive.Edit className="rounded px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">
            Edit
          </ActionBarPrimitive.Edit>
          <ActionBarPrimitive.Reload className="rounded px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">
            Retry
          </ActionBarPrimitive.Reload>
          <ActionBarPrimitive.Copy className="rounded px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300">
            Copy
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
        <BranchPickerPrimitive.Root
          hideWhenSingleBranch
          className="flex items-center gap-1 text-xs text-zinc-600"
        >
          <BranchPickerPrimitive.Previous className="rounded border border-transparent px-2 py-1 hover:border-white/[0.08] hover:bg-zinc-800 hover:text-zinc-300">
            ‹
          </BranchPickerPrimitive.Previous>
          <span className="min-w-[2.5rem] text-center font-mono text-[11px]">
            <BranchPickerPrimitive.Count />
          </span>
          <BranchPickerPrimitive.Next className="rounded border border-transparent px-2 py-1 hover:border-white/[0.08] hover:bg-zinc-800 hover:text-zinc-300">
            ›
          </BranchPickerPrimitive.Next>
        </BranchPickerPrimitive.Root>
        <FollowUpSuggestions />
      </div>
    </MessagePrimitive.Root>
  );
}

function PremiumComposer() {
  return (
    <div className="border-t border-[var(--surface-border)] px-4 pb-4 pt-3">
      <div className="relative rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-lg shadow-black/40 transition-all focus-within:border-blue-500/40 focus-within:bg-[#13131a]">
        <ComposerPrimitive.Input
          placeholder="Message the agent…"
          className="max-h-[200px] min-h-[56px] w-full resize-none border-0 bg-transparent px-4 pb-12 pt-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <ComposerPrimitive.Cancel className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-zinc-500 transition-all hover:bg-white/[0.04] hover:text-zinc-300">
            Stop
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30">
            ↑
          </ComposerPrimitive.Send>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-zinc-700">
        AG-UI · Pydantic AI · MCP
      </p>
    </div>
  );
}

export function PremiumThread() {
  return (
    <ThreadPrimitive.Root className="relative flex h-full min-h-0 flex-col bg-[var(--background)]">
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20">
            <span className="text-xs font-bold text-blue-400">AI</span>
          </div>
          <span className="text-sm font-medium text-zinc-200">
            Pydantic AI Agent
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Live
          </span>
        </div>
      </div>

      <ThreadPrimitive.Viewport className="scrollbar-thin min-h-0 max-h-[calc(100vh-280px)] flex-1 overflow-y-auto px-4 py-6">
        <ThreadPrimitive.Empty>
          <WelcomeScreen />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <ThreadPrimitive.ScrollToBottom className="absolute bottom-40 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-zinc-400 shadow-lg transition-all hover:text-white" />

      <PremiumComposer />
    </ThreadPrimitive.Root>
  );
}
