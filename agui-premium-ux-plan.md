# AG-UI POC — Premium UX Patterns Plan

**Goal:** Implement Claude / OpenAI / Perplexity-grade UX patterns using `@assistant-ui/react` primitives  
**Scope:** Thinking blocks, Plan → Execute, Human-in-the-Loop, Follow-up suggestions, and all supporting patterns  
**Base:** Existing AG-UI × Pydantic AI × CopilotKit POC

---

## Architecture of UX Patterns

Every pattern in this plan maps to exactly one `assistant-ui` primitive or hook. The Pydantic AI backend emits standard AG-UI SSE events — the frontend decides how to render each.

```
Pydantic AI Backend
│
│  emits AG-UI events
│  ├── STEP_STARTED / STEP_FINISHED      → Thinking / Chain-of-Thought
│  ├── TOOL_CALL_START (present_plan)    → Plan → Execute / Cancel
│  ├── TOOL_CALL_START (confirm_action)  → Human-in-the-Loop
│  ├── TEXT_MESSAGE_CHUNK                → Streaming text
│  └── RUN_FINISHED                      → Triggers follow-up suggestions
│
└── @assistant-ui/react-ag-ui
    ├── MessagePrimitive.GroupedParts    → Groups reasoning + tool steps
    ├── makeAssistantToolUI              → Custom render per tool name
    ├── addResult()                      → Resume agent with user decision
    ├── SuggestionAdapter                → Dynamic follow-up generation
    └── ThreadPrimitive.Suggestion       → Clickable suggestion pills
```

---

## Pattern 1 — Thinking / Reasoning Block

**Reference:** Claude "Extended Thinking", OpenAI o3 "Thought process", DeepSeek R1  
**API:** `MessagePrimitive.GroupedParts` + `ChainOfThought` component slot

### What it does

Groups all consecutive `STEP_STARTED`, `STEP_FINISHED`, and reasoning parts that arrive before the final text response into a **single collapsible block**. Auto-expands while the agent is thinking, auto-collapses when the response is complete.

### Backend (Pydantic AI)

No changes needed. Pydantic AI emits `STEP_STARTED` / `STEP_FINISHED` events automatically for every internal agent step. For explicit reasoning text (extended thinking), use:

```python
# backend/agents/thinking_agent.py
from pydantic_ai import Agent

agent = Agent(
    "anthropic:claude-opus-4-5",  # Extended thinking model
    model_settings={"thinking": {"type": "enabled", "budget_tokens": 5000}},
    system_prompt="Think step by step before answering."
)
```

For OpenAI o3/o4-mini, reasoning tokens are emitted automatically — no extra config.

### Frontend

```tsx
// components/AssistantMessage.tsx
import { MessagePrimitive } from "@assistant-ui/react";
import { useMessage } from "@assistant-ui/react";
import { useState, useEffect } from "react";

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex gap-3 group my-4">
      <AgentAvatar />
      <div className="flex-1 min-w-0 space-y-2">
        <MessagePrimitive.GroupedParts
          components={{
            ChainOfThought: ThinkingBlock, // ← all reasoning parts grouped here
            Text: StreamingTextPart,
          }}
        />
        <ActionBar />
      </div>
    </MessagePrimitive.Root>
  );
}
```

```tsx
// components/ThinkingBlock.tsx
function ThinkingBlock({ children }: { children: React.ReactNode }) {
  const isRunning = useMessage((m) => m.status.type === "running");
  const [open, setOpen] = useState(true);

  // Auto-collapse when agent finishes — Claude behaviour
  useEffect(() => {
    if (!isRunning) {
      const timer = setTimeout(() => setOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isRunning]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f11] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5
                   text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {isRunning ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-amber-400/60
                             border-t-transparent animate-spin" />
            <span className="text-amber-400/80 font-medium">Thinking…</span>
          </>
        ) : (
          <>
            <span className="text-emerald-500">✓</span>
            <span className="font-medium">Thought process</span>
          </>
        )}
        <span className="ml-auto text-zinc-700 text-[10px]">
          {open ? "Hide" : "Show"}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]
                        text-xs text-zinc-600 leading-relaxed italic space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
```

**Individual reasoning text part** (for models with explicit `<thinking>` tokens):

```tsx
// In MessagePrimitive.Parts components map
Reasoning: ({ part }) => (
  <div className="text-xs text-zinc-600 italic border-l-2 border-zinc-800 pl-3 my-1">
    {part.text}
  </div>
),
```

### Visual Result

```
┌─────────────────────────────────────────────────────┐
│  ✓  Thought process                          Hide ⌄  │
├─────────────────────────────────────────────────────┤
│  First, I need to find the current BTC price…        │
│  Then calculate at the given funding rate…           │
│  Finally, format as a table…                         │
└─────────────────────────────────────────────────────┘

The BTC funding rate is 0.012% per 8h. For 0.5 BTC at $95,400…
```

---

## Pattern 2 — Plan → Execute / Cancel

**Reference:** OpenAI o3 "Plan mode", Devin "Let me plan this first"  
**API:** `makeAssistantToolUI` + `addResult({ approved, modified_steps })`

### What it does

Before executing a sequence of 3+ actions, the agent surfaces a plan card with numbered steps. The user can **remove individual steps**, then approve or cancel. The agent receives the (possibly modified) step list before proceeding.

### Backend (Pydantic AI)

```python
# backend/tools.py — add to existing tools

@agent.tool
async def present_plan(
    ctx: RunContext,
    steps: list[str],
    action_summary: str
) -> dict:
    """
    ALWAYS call this tool before executing 3 or more sequential actions.
    Present the plan to the user and wait for approval.
    Returns: { approved: bool, modified_steps: list[str] | null }
    """
    # Pydantic AI suspends here, waiting for the frontend's addResult() call
    return {}
```

Update system prompt to enforce plan-first behaviour:

```python
system_prompt = """
You are a helpful agent. When a task requires 3 or more distinct actions,
you MUST call present_plan() first with a clear list of steps.
Wait for user approval before proceeding.
If the user cancels, acknowledge and stop.
If they modify steps, only execute the approved steps.
"""
```

### Frontend

```tsx
// components/tools/PlanApprovalToolUI.tsx
import { makeAssistantToolUI } from "@assistant-ui/react";

export const PlanApprovalToolUI = makeAssistantToolUI<
  { steps: string[]; action_summary: string },
  { approved: boolean; modified_steps?: string[] }
>({
  toolName: "present_plan",
  render: ({ args, addResult, status }) => {
    const [steps, setSteps] = useState(args.steps ?? []);

    // Post-decision state
    if (status.type === "complete") {
      const approved = status.result?.approved;
      return (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg my-1
          ${approved
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-zinc-800/50 text-zinc-500 border border-white/[0.05]"
          }`}>
          {approved ? "✓ Plan approved" : "✗ Plan cancelled"}
          {approved && (
            <span className="text-zinc-600 ml-1">
              — executing {steps.length} steps
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111115] overflow-hidden my-3">

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5">
          <span className="text-amber-400">⚡</span>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Proposed Plan</p>
            <p className="text-xs text-zinc-600 mt-0.5">{args.action_summary}</p>
          </div>
          <span className="ml-auto text-xs text-zinc-700 font-mono">
            {steps.length} steps
          </span>
        </div>

        {/* Steps — removable */}
        <ol className="px-4 py-3 space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 group/step">
              <span className="w-5 h-5 rounded-full bg-zinc-800 border border-white/[0.06]
                               text-zinc-500 text-[10px] flex items-center justify-center
                               flex-shrink-0 mt-0.5 font-mono">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-300 flex-1 leading-snug">{step}</span>
              <button
                onClick={() => setSteps(s => s.filter((_, j) => j !== i))}
                className="opacity-0 group-hover/step:opacity-100 text-zinc-700
                           hover:text-red-400 text-sm transition-all mt-0.5 flex-shrink-0"
                title="Remove step"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>

        {steps.length === 0 && (
          <div className="px-4 pb-3 text-xs text-zinc-600 italic">
            All steps removed. Cancel or add steps back.
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2">
          <button
            onClick={() => addResult({ approved: true, modified_steps: steps })}
            disabled={steps.length === 0}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                       disabled:opacity-30 disabled:cursor-not-allowed
                       text-white text-sm font-medium transition-all"
          >
            Execute Plan
          </button>
          <button
            onClick={() => addResult({ approved: false })}
            className="px-4 py-2 rounded-lg border border-white/[0.08]
                       text-zinc-400 hover:text-zinc-200 text-sm transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  },
});
```

Register in your layout:

```tsx
// app/layout.tsx — inside AssistantRuntimeProvider
<PlanApprovalToolUI />
<SendEmailToolUI />
<DeleteFileToolUI />
{/* one registration per HITL tool */}
```

---

## Pattern 3 — Human-in-the-Loop (Single Action Approval)

**Reference:** Any agent taking a destructive or external action  
**API:** Same as Pattern 2 — `makeAssistantToolUI` + `addResult`

### Three Variants

#### Variant A — Simple Confirm/Cancel (e.g., send email, post message)

```tsx
export const SendEmailToolUI = makeAssistantToolUI<
  { to: string; subject: string; preview: string },
  { approved: boolean }
>({
  toolName: "send_email",
  render: ({ args, addResult, status }) => {
    if (status.type === "complete") {
      return status.result?.approved
        ? <SuccessBadge>Email sent to {args.to}</SuccessBadge>
        : <CancelledBadge>Email not sent</CancelledBadge>;
    }

    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] my-2 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-500/10">
          <span className="text-amber-400">⚠</span>
          <span className="text-sm font-semibold text-amber-300">Confirm action</span>
        </div>
        <div className="px-4 py-3 text-sm space-y-1.5">
          <Row label="To" value={args.to} />
          <Row label="Subject" value={args.subject} />
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-3">
            {args.preview}
          </p>
        </div>
        <div className="px-4 py-3 flex gap-2 border-t border-amber-500/10">
          <button onClick={() => addResult({ approved: true })}
            className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black
                       text-sm font-semibold rounded-lg transition-all">
            Send Email
          </button>
          <button onClick={() => addResult({ approved: false })}
            className="px-4 py-2 border border-white/[0.08] text-zinc-400
                       text-sm rounded-lg hover:text-zinc-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    );
  },
});
```

#### Variant B — Input Form (e.g., agent asks for missing info)

```tsx
export const MissingInfoToolUI = makeAssistantToolUI<
  { question: string; field_name: string; field_type: "text" | "number" | "date" },
  { value: string }
>({
  toolName: "ask_user_input",
  render: ({ args, addResult, status }) => {
    const [value, setValue] = useState("");
    if (status.type === "complete") return <AnsweredBadge>{status.result?.value}</AnsweredBadge>;

    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] my-2 overflow-hidden">
        <div className="px-4 py-3 border-b border-blue-500/10">
          <p className="text-sm text-zinc-200">{args.question}</p>
        </div>
        <div className="px-4 py-3 flex gap-2">
          <input
            type={args.field_type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${args.field_name}…`}
            className="flex-1 bg-zinc-900 border border-white/[0.08] rounded-lg
                       px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600
                       focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={() => addResult({ value })}
            disabled={!value.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
                       rounded-lg disabled:opacity-30 transition-all font-medium"
          >
            Submit
          </button>
        </div>
      </div>
    );
  },
});
```

#### Variant C — Destructive Action (e.g., delete file, wipe database)

```tsx
export const DeleteFileToolUI = makeAssistantToolUI<
  { path: string; size_kb: number },
  { confirmed: boolean }
>({
  toolName: "delete_file",
  render: ({ args, addResult, status }) => {
    const [typed, setTyped] = useState("");
    const filename = args.path.split("/").at(-1) ?? args.path;
    if (status.type === "complete") {
      return status.result?.confirmed
        ? <DangerBadge>Deleted: {filename}</DangerBadge>
        : <CancelledBadge>Deletion cancelled</CancelledBadge>;
    }

    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] my-2 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-red-500/10">
          <span className="text-red-400">🗑</span>
          <span className="text-sm font-semibold text-red-300">Destructive action</span>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-zinc-300">
            Permanently delete <code className="text-red-300 bg-red-500/10 px-1 rounded">{filename}</code>
            <span className="text-zinc-600 ml-1">({args.size_kb} KB)</span>
          </p>
          <p className="text-xs text-zinc-600">This cannot be undone. Type the filename to confirm.</p>
          <input
            type="text"
            placeholder={filename}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2
                       text-sm text-zinc-200 focus:outline-none focus:border-red-500/50
                       placeholder:text-zinc-700 transition-colors font-mono"
          />
        </div>
        <div className="px-4 py-3 flex gap-2 border-t border-red-500/10">
          <button
            onClick={() => addResult({ confirmed: true })}
            disabled={typed !== filename}
            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm
                       font-semibold rounded-lg disabled:opacity-30 transition-all"
          >
            Delete permanently
          </button>
          <button onClick={() => addResult({ confirmed: false })}
            className="px-4 py-2 border border-white/[0.08] text-zinc-400 text-sm
                       rounded-lg hover:text-zinc-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    );
  },
});
```

---

## Pattern 4 — Follow-up Suggestions After Response

**Reference:** Perplexity (related questions), Claude (try asking), ChatGPT (suggestions)  
**API:** `SuggestionAdapter` in `useAgUiRuntime` + `ThreadPrimitive.Suggestion`

### What it does

After every assistant response, a lightweight call to a fast model generates 3 contextual follow-up prompts. These render as clickable pills below the last message. Clicking a pill populates the composer (or sends immediately, depending on `autoSend`).

### Backend

```python
# backend/routes/suggestions.py
from fastapi import APIRouter
from pydantic import BaseModel
from pydantic_ai import Agent

router = APIRouter()

suggestion_agent = Agent(
    "openai:gpt-4o-mini",  # Fast + cheap — ideal for suggestions
    system_prompt="""Generate exactly 3 short follow-up questions a user might ask
    after receiving this AI response. Rules:
    - Max 8 words per suggestion
    - Be specific to the content, not generic
    - Vary the type: one factual, one analytical, one actionable
    - Return ONLY a JSON array of 3 strings, nothing else"""
)

class SuggestionRequest(BaseModel):
    last_message: str

@router.post("/api/suggestions")
async def get_suggestions(req: SuggestionRequest):
    result = await suggestion_agent.run(req.last_message[:600])
    try:
        prompts = json.loads(result.output)
        return [{"prompt": p, "autoSend": False} for p in prompts[:3]]
    except Exception:
        return []
```

### Frontend

```tsx
// providers.tsx — wire suggestions to runtime
const runtime = useAgUiRuntime({
  agent,
  suggestions: {
    generate: async ({ messages }) => {
      const last = messages.findLast((m) => m.role === "assistant");
      if (!last) return [];

      const text = last.content
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_message: text }),
      });
      return res.ok ? res.json() : [];
    },
  },
});
```

```tsx
// components/FollowUpSuggestions.tsx
import { ThreadPrimitive } from "@assistant-ui/react";
import { useMessage } from "@assistant-ui/react";

export function FollowUpSuggestions() {
  const isLast = useMessage((m) => m.isLast);
  const role = useMessage((m) => m.role);

  // Only render after the last assistant message
  if (!isLast || role !== "assistant") return null;

  return (
    <div className="mt-4 pl-10">
      <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest mb-2.5">
        Related
      </p>
      <div className="flex flex-wrap gap-2">
        <ThreadPrimitive.Suggestions
          components={{ Suggestion: SuggestionPill }}
        />
      </div>
    </div>
  );
}

function SuggestionPill({ suggestion }: { suggestion: { prompt: string } }) {
  return (
    <ThreadPrimitive.Suggestion
      prompt={suggestion.prompt}
      autoSend={false}
      className="group flex items-center gap-1.5 text-xs text-zinc-500
                 border border-white/[0.06] rounded-full px-3 py-1.5
                 hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.12]
                 transition-all cursor-pointer"
    >
      <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors">›</span>
      {suggestion.prompt}
    </ThreadPrimitive.Suggestion>
  );
}
```

Integrate into the assistant message:

```tsx
// AssistantMessage.tsx — add after content parts
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex gap-3 group my-4">
      <AgentAvatar />
      <div className="flex-1 min-w-0 space-y-2">
        <MessagePrimitive.GroupedParts
          components={{ ChainOfThought: ThinkingBlock, Text: StreamingTextPart }}
        />
        <ActionBar />
        <FollowUpSuggestions />  {/* ← rendered only on last message */}
      </div>
    </MessagePrimitive.Root>
  );
}
```

---

## Pattern 5 — Supporting Patterns (Smaller but Impactful)

### 5a — Stop Generation Button

```tsx
// ComposerPrimitive.Cancel renders automatically when agent is running
<ComposerPrimitive.Cancel asChild>
  <button className="px-4 py-2 rounded-lg bg-zinc-800 border border-white/[0.08]
                     text-zinc-300 text-sm hover:bg-zinc-700 transition-all
                     flex items-center gap-2">
    <span className="w-2 h-2 rounded-sm bg-zinc-300" />  {/* stop square */}
    Stop
  </button>
</ComposerPrimitive.Cancel>
```

### 5b — Edit Message + Regenerate (ChatGPT-style)

```tsx
<ActionBarPrimitive.Root
  hideWhenRunning
  autohide="not-last"
  className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
>
  <ActionBarPrimitive.Edit asChild>
    <IconButton tooltip="Edit message" icon={<PencilIcon />} />
  </ActionBarPrimitive.Edit>
  <ActionBarPrimitive.Reload asChild>
    <IconButton tooltip="Regenerate" icon={<RefreshIcon />} />
  </ActionBarPrimitive.Reload>
  <ActionBarPrimitive.Copy asChild>
    <IconButton tooltip="Copy" icon={<CopyIcon />} />
  </ActionBarPrimitive.Copy>
</ActionBarPrimitive.Root>
```

### 5c — Branch Picker (Claude alternate responses)

```tsx
<BranchPickerPrimitive.Root
  hideWhenSingleBranch
  className="flex items-center gap-1 text-xs text-zinc-600"
>
  <BranchPickerPrimitive.Previous asChild>
    <IconButton icon={<ChevronLeft className="w-3 h-3" />} />
  </BranchPickerPrimitive.Previous>
  <BranchPickerPrimitive.Count />
  <BranchPickerPrimitive.Next asChild>
    <IconButton icon={<ChevronRight className="w-3 h-3" />} />
  </BranchPickerPrimitive.Next>
</BranchPickerPrimitive.Root>
```

### 5d — Dynamic System Prompt (context injection)

```tsx
// Inject current page state into every agent call — no manual passing needed
import { useAssistantInstructions } from "@assistant-ui/react";

function DashboardPage() {
  const { filters, selectedSymbol, timeframe } = useDashboardStore();

  useAssistantInstructions(`
    User's current dashboard context:
    - Selected symbol: ${selectedSymbol}
    - Active timeframe: ${timeframe}
    - Applied filters: ${JSON.stringify(filters)}
    Always reference this context when answering questions about the data.
  `);

  return <DashboardUI />;
}
```

### 5e — Streaming Partial Args in Tool UI

Show a live preview of tool output **while the agent is still generating** — impressively real-time:

```tsx
export const DataTableToolUI = makeAssistantToolUI<
  { rows: Array<{ symbol: string; price: number; change: number }> },
  void
>({
  toolName: "render_data_table",
  render: ({ args, status }) => {
    const rows = args.rows ?? []; // partial while streaming

    return (
      <div className="rounded-xl border border-white/[0.06] overflow-hidden my-2">
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Live Data
          </span>
          {status.type === "running" && (
            <span className="text-[10px] text-amber-400/70 animate-pulse">● streaming</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["Symbol", "Price", "24h Change"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs text-zinc-600 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 font-mono text-zinc-200">{row.symbol}</td>
                <td className="px-4 py-2.5 font-mono text-zinc-300">
                  ${row.price?.toLocaleString()}
                </td>
                <td className={`px-4 py-2.5 font-mono text-xs ${
                  (row.change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {(row.change ?? 0) >= 0 ? "+" : ""}{row.change?.toFixed(2)}%
                </td>
              </tr>
            ))}
            {/* Skeleton rows while streaming */}
            {status.type === "running" && rows.length < 3 && (
              Array.from({ length: 3 - rows.length }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-white/[0.03]">
                  {[1,2,3].map((j) => (
                    <td key={j} className="px-4 py-2.5">
                      <div className="h-3 rounded bg-zinc-800 animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  },
});
```

---

## Implementation Checklist

### Files to Create

```
frontend/components/
├── chat/
│   ├── AssistantMessage.tsx       ← GroupedParts, ThinkingBlock, FollowUpSuggestions
│   ├── UserMessage.tsx            ← User bubble
│   ├── ThinkingBlock.tsx          ← Pattern 1
│   ├── ActionBar.tsx              ← Edit, copy, regenerate, branch picker
│   └── FollowUpSuggestions.tsx    ← Pattern 4
│
├── tools/
│   ├── PlanApprovalToolUI.tsx     ← Pattern 2
│   ├── SendEmailToolUI.tsx        ← Pattern 3a
│   ├── MissingInfoToolUI.tsx      ← Pattern 3b
│   ├── DeleteFileToolUI.tsx       ← Pattern 3c
│   └── DataTableToolUI.tsx        ← Pattern 5e
│
└── providers.tsx                  ← SuggestionAdapter wired to runtime

backend/
├── tools.py                       ← Add present_plan, ask_user_input, confirm_action
└── routes/suggestions.py          ← POST /api/suggestions endpoint
```

### Build Order

| Step | Task | Time |
|---|---|---|
| 1 | `ThinkingBlock` + `GroupedParts` wiring | 2h |
| 2 | `PlanApprovalToolUI` + backend `present_plan` tool | 2h |
| 3 | `SendEmailToolUI` + `MissingInfoToolUI` (HITL variants) | 2h |
| 4 | `DeleteFileToolUI` (destructive variant) | 1h |
| 5 | `SuggestionAdapter` + `/api/suggestions` endpoint | 2h |
| 6 | `FollowUpSuggestions` + `ActionBar` + branch picker | 1.5h |
| 7 | `DataTableToolUI` with streaming partial args | 1.5h |
| 8 | `useAssistantInstructions` context injection | 0.5h |
| **Total** | | **~12.5h** |

---

## Quick Reference: Pattern → API Mapping

| Platform Feature | `assistant-ui` API | Backend Touch? |
|---|---|---|
| Thinking / reasoning block | `MessagePrimitive.GroupedParts` + `ChainOfThought` slot | No |
| Individual reasoning text | `MessagePrimitive.Parts` `Reasoning` component | No |
| Plan → Execute / Cancel | `makeAssistantToolUI` + `addResult()` | Add `present_plan` tool |
| HITL simple confirm | `makeAssistantToolUI` + `addResult()` | Add `confirm_action` tool |
| HITL input form | `makeAssistantToolUI` + `addResult()` | Add `ask_user_input` tool |
| HITL destructive action | `makeAssistantToolUI` + `addResult()` | Add per-tool |
| Follow-up suggestions | `SuggestionAdapter` + `ThreadPrimitive.Suggestion` | Add `/api/suggestions` |
| Stop generation | `ComposerPrimitive.Cancel` | No |
| Edit + regenerate | `ActionBarPrimitive.Edit` + `Reload` | No |
| Alternate response branches | `BranchPickerPrimitive.*` | No |
| Dynamic context injection | `useAssistantInstructions` | No |
| Streaming partial tool args | `makeAssistantToolUI` args partial typing | No |
