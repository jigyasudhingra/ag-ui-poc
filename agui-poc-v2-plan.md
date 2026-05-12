# AG-UI POC v2 — Premium UI + MCP Layer Plan

**Project:** AG-UI × Pydantic AI POC — Phase 2 Upgrade  
**New Additions:** `@assistant-ui/react-ag-ui` (premium UI layer) · MCP (Model Context Protocol) tools  
**Base:** Existing CopilotKit + AG-UI + Pydantic AI POC (Phase 1)  
**Design Goal:** OpenAI-quality interface, more premium, more aesthetic

---

## What Changes in v2

The Phase 1 POC used CopilotKit's pre-built `<CopilotChat />` component for the UI layer. v2 keeps CopilotKit for all agentic logic (state sync, HITL, context injection) but introduces `@assistant-ui/react-ag-ui` as the **UI rendering layer** — giving full control over every pixel of the chat interface while the same Pydantic AI backend serves both.[cite:36] MCP is added as a third tool source alongside Tavily and custom tools, making the agent truly extensible.[cite:96]

### The Three-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  UI Layer — @assistant-ui/react-ag-ui                        │
│  ThreadPrimitive, MessagePrimitive, ComposerPrimitive        │
│  Custom shadcn/ui components. Fully headless, yours to own.  │
├──────────────────────────────────────────────────────────────┤
│  Protocol Layer — AG-UI (SSE events)                         │
│  useAgUiRuntime ← HttpAgent → Pydantic AI backend            │
├──────────────────────────────────────────────────────────────┤
│  Agent Layer — Pydantic AI + FastAPI                         │
│  Custom tools + Tavily + MCP client connections              │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 1 — Premium UI with @assistant-ui/react-ag-ui

### Why Switch the UI Layer

CopilotKit's `<CopilotChat />` is excellent for rapid prototyping but is opinionated in its design — you can theme it, but you cannot fully escape its DOM structure.[cite:36] `@assistant-ui/react-ag-ui` provides **headless primitives** built on Radix UI — no forced styles, WAI-ARIA compliant, composable down to the atom level.[cite:74] The same AG-UI SSE events from the Pydantic AI backend power both. The backend does not change at all.[cite:36]

### Install

```bash
# Core assistant-ui packages
pnpm add @assistant-ui/react @assistant-ui/react-ag-ui

# AG-UI client
pnpm add @ag-ui/client

# Design system
pnpm add tailwindcss @tailwindcss/typography
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button textarea scroll-area avatar badge tooltip separator
```

### Wire the Runtime

```tsx
// app/providers.tsx
"use client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { HttpAgent } from "@ag-ui/client";

const agent = new HttpAgent({
  url: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/tools-demo",
});

export function Providers({ children }: { children: React.ReactNode }) {
  const runtime = useAgUiRuntime({
    agent,
    showThinking: true,       // renders THINKING_* and REASONING_* events
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### Design System — Dark Premium Theme

The goal is OpenAI o3-level polish: near-black base, subtle warm surfaces, single accent color (electric blue or teal), generous spacing, `Inter` or `Geist` as body font.

```css
/* globals.css — premium dark palette */
:root {
  --background:        #0a0a0b;   /* near-black, not pure */
  --surface:           #111113;
  --surface-2:         #18181b;
  --surface-border:    rgba(255,255,255,0.06);
  --text-primary:      #ececec;
  --text-muted:        #71717a;
  --text-faint:        #3f3f46;
  --accent:            #2563eb;   /* electric blue — change to teal for warmth */
  --accent-glow:       rgba(37,99,235,0.15);
  --user-bubble:       #1e1e24;
  --assistant-bg:      transparent;
  --radius:            0.75rem;
  --font-body:         'Geist', 'Inter', system-ui, sans-serif;
  --font-mono:         'Geist Mono', 'JetBrains Mono', monospace;
}
```

**Font loading:**
```html
<!-- In layout.tsx <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..600&display=swap"
      rel="stylesheet" />
```

### Building the Premium Thread Component

The full chat UI is built from `ThreadPrimitive`, `MessagePrimitive`, and `ComposerPrimitive` — each is a Radix-style headless component.[cite:70] Style them entirely with Tailwind.

```tsx
// components/PremiumThread.tsx
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  BranchPickerPrimitive,
} from "@assistant-ui/react";

export function PremiumThread() {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full bg-[#0a0a0b]">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">AI</span>
          </div>
          <span className="text-sm font-medium text-zinc-200">Pydantic AI Agent</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
            Live
          </span>
        </div>
      </div>

      {/* Messages */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6 space-y-6
                                           scrollbar-thin scrollbar-thumb-white/10">
        <ThreadPrimitive.Empty>
          <WelcomeScreen />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            AssistantMessage: AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      {/* Scroll to bottom */}
      <ThreadPrimitive.ScrollToBottom className="absolute bottom-24 right-6
        w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center
        justify-center text-zinc-400 hover:text-white transition-all shadow-lg" />

      {/* Composer */}
      <PremiumComposer />
    </ThreadPrimitive.Root>
  );
}
```

### Welcome Screen (Empty State)

```tsx
function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
      {/* Glow orb — subtle, not garish */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-2xl scale-150" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30
                        to-blue-800/30 border border-blue-500/20 flex items-center justify-center">
          <span className="text-2xl">✦</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-zinc-100">What can I help with?</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          Powered by Pydantic AI with web search, calculations, MCP tools and more.
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {[
          "Search latest AI news",
          "Calculate compound interest",
          "Convert 180 lbs to kg",
          "What day is Dec 25, 2026?",
        ].map((s) => (
          <ThreadPrimitive.Suggestion
            key={s}
            prompt={s}
            className="text-xs text-zinc-400 border border-white/[0.06] rounded-xl px-3 py-2.5
                       bg-white/[0.02] hover:bg-white/[0.05] hover:text-zinc-200 transition-all
                       text-left cursor-pointer"
          />
        ))}
      </div>
    </div>
  );
}
```

### User & Assistant Message Components

```tsx
// User bubble — right-aligned, colored background
function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end gap-3">
      <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm
                      bg-blue-600/20 border border-blue-500/20 text-sm text-zinc-100
                      leading-relaxed">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

// Assistant — left-aligned, no bubble, subtle avatar
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10
                      flex items-center justify-center text-xs text-zinc-400 flex-shrink-0 mt-1">
        ✦
      </div>
      <div className="flex-1 space-y-3">
        {/* Thinking panel — renders STEP_STARTED/FINISHED events */}
        <MessagePrimitive.Parts
          components={{
            text: TextPart,
            tool_call: ToolCallPart,
            reasoning: ReasoningPart,
          }}
        />
        {/* Branch picker for conversation branching */}
        <BranchPickerPrimitive.Root className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <BranchPickerPrimitive.Previous className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1" />
          <BranchPickerPrimitive.Count className="text-xs text-zinc-600" />
          <BranchPickerPrimitive.Next className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1" />
        </BranchPickerPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}
```

### Tool Call UI Parts

```tsx
// Renders inline for every TOOL_CALL_START → TOOL_CALL_END cycle
function ToolCallPart({ part }: { part: ToolCallPart }) {
  const isRunning = part.status === "running";
  const toolIcons: Record<string, string> = {
    tavily_search_tool: "🔍",
    calculator: "🧮",
    unit_converter: "📐",
    datetime_tool: "🕐",
    data_formatter: "📊",
    random_generator: "🎲",
    mcp_tool: "🔌",
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border
        transition-all ${isRunning
          ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
        <span>{toolIcons[part.toolName] ?? "🔧"}</span>
        <span className="font-mono font-medium">{part.toolName}</span>
        {isRunning ? <span>Running…</span> : <span>Done</span>}
      </div>
    </div>
  );
}

// Collapsible reasoning/thinking panel
function ReasoningPart({ part }: { part: ReasoningPart }) {
  return (
    <details className="group">
      <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform">›</span>
        Thinking…
      </summary>
      <div className="mt-2 pl-3 border-l border-white/[0.06] text-xs text-zinc-500 leading-relaxed italic">
        {part.text}
      </div>
    </details>
  );
}
```

### Premium Composer

```tsx
function PremiumComposer() {
  return (
    <div className="px-4 pb-4">
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#111113]
                      focus-within:border-blue-500/40 focus-within:bg-[#13131a]
                      transition-all shadow-lg shadow-black/40">
        <ComposerPrimitive.Input
          placeholder="Message the agent…"
          className="w-full bg-transparent px-4 pt-4 pb-12 text-sm text-zinc-100
                     placeholder:text-zinc-600 resize-none outline-none
                     min-h-[56px] max-h-[200px]"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {/* Cancel button — appears when agent is running */}
          <ComposerPrimitive.Cancel className="text-xs text-zinc-500 hover:text-zinc-300
            px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-all">
            Stop
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500
            flex items-center justify-center text-white text-sm font-medium transition-all
            disabled:opacity-30 disabled:cursor-not-allowed shadow-blue-600/30 shadow-lg">
            ↑
          </ComposerPrimitive.Send>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-700 mt-2">
        AG-UI · Pydantic AI · MCP
      </p>
    </div>
  );
}
```

### Sidebar — Thread List + Navigation

```tsx
// Multi-thread sidebar (experimental adapter in useAgUiRuntime)
import { ThreadListPrimitive, ThreadListItemPrimitive } from "@assistant-ui/react";

function Sidebar() {
  return (
    <div className="w-64 flex flex-col h-full bg-[#0a0a0b] border-r border-white/[0.05]">
      <div className="p-3">
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
          bg-white/[0.04] border border-white/[0.06] text-sm text-zinc-300
          hover:bg-white/[0.07] transition-all">
          <span>✦</span> New conversation
        </button>
      </div>

      {/* Demo sections */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-1">
          Demos
        </p>
        {demoRoutes.map((route) => (
          <NavItem key={route.slug} {...route} />
        ))}
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-1">
          History
        </p>
        <ThreadListPrimitive.Root>
          <ThreadListPrimitive.Items
            components={{ ThreadListItem: ConversationItem }}
          />
        </ThreadListPrimitive.Root>
      </div>
    </div>
  );
}
```

---

## Part 2 — MCP Layer (Model Context Protocol)

### What MCP Adds

MCP (Model Context Protocol) is the open standard introduced by Anthropic in November 2024 that defines how AI agents connect to external tools and data sources.[cite:91] It sits one level below AG-UI in the stack — AG-UI is about agent-to-frontend communication, MCP is about agent-to-tool communication.[cite:96] Adding MCP to the POC means the Pydantic AI agent can dynamically discover and call tools from any MCP-compliant server — filesystem, databases, GitHub, web scrapers, and more — without changing the agent code.[cite:96]

Pydantic AI supports MCP in three modes:[cite:96]
1. **Agent as MCP Client** — connects to existing MCP servers to use their tools
2. **Agent as MCP Server** — exposes the agent itself as a tool for other agents
3. **`MCPServerTool`** — built-in tool that lets the LLM provider handle MCP communication directly (OpenAI Responses API + Anthropic only)[cite:93]

### Install

```bash
uv add "pydantic-ai-slim[mcp]"
# or for full package
uv add pydantic-ai
```

### Mode 1 — Agent as MCP Client (Recommended for POC)

Connect the Pydantic AI agent to MCP servers at startup. Every tool exposed by the MCP server becomes available to the agent automatically — no manual registration needed.[cite:96]

```python
# backend/mcp_agent.py
import asyncio
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStdio, MCPServerHTTP

# Connect to multiple MCP servers simultaneously
agent = Agent(
    "openai:gpt-4o",
    mcp_servers=[
        # Filesystem MCP server — read/write local files
        MCPServerStdio("npx", ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/poc-data"]),

        # Brave/Tavily search via MCP — alternative to direct Tavily integration
        MCPServerHTTP(url="https://mcp.tavily.com/mcp/", headers={"Authorization": f"Bearer {TAVILY_KEY}"}),

        # Custom MCP server you define (see below)
        MCPServerStdio("python", ["-m", "mcp_servers.crypto_prices"]),
    ],
    system_prompt="You have access to filesystem, web search, and crypto price tools via MCP."
)

# Must run inside an async context manager to manage MCP connections
async def run_with_mcp(user_message: str):
    async with agent.run_mcp_servers():
        result = await agent.run(user_message)
        return result.output
```

### Mode 2 — MCPServerTool (Provider-side, lower latency)

For OpenAI Responses API — the MCP call happens on OpenAI's infrastructure, reducing round-trips:[cite:93]

```python
from pydantic_ai.tools import MCPServerTool

agent = Agent(
    "openai:gpt-4o",  # Must use Responses API model
    tools=[
        MCPServerTool(
            url="https://mcp.deepwiki.com/mcp",  # Public MCP server, no auth needed
        )
    ]
)
```

### Mode 3 — Build a Custom MCP Server

Expose your own custom tools as an MCP server. Other agents (Cursor, Claude Desktop, etc.) can then also use them:[cite:92]

```python
# backend/mcp_servers/crypto_prices.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Crypto Prices")

@mcp.tool()
def get_crypto_price(symbol: str) -> dict:
    """Get the current price of a cryptocurrency by symbol (e.g. BTC, ETH)."""
    # Mock — replace with real API call (CoinDCX, Binance, etc.)
    prices = {"BTC": 95400.0, "ETH": 3210.0, "SOL": 165.0}
    return {
        "symbol": symbol.upper(),
        "price_usd": prices.get(symbol.upper(), 0),
        "source": "mock-exchange"
    }

@mcp.tool()
def get_funding_rate(symbol: str) -> dict:
    """Get perpetual futures funding rate for a symbol."""
    rates = {"BTC": 0.0012, "ETH": 0.0008}
    return {"symbol": symbol, "rate": rates.get(symbol.upper(), 0), "period": "8h"}

if __name__ == "__main__":
    mcp.run()  # Starts stdio MCP server
```

This is particularly useful for the POC because it demonstrates the **MCP tool discovery** pattern — the agent doesn't know the tool exists until it connects to the server, then it can call `get_crypto_price` just like any `@agent.tool`.

### AG-UI Route with MCP

```python
# backend/routes/mcp_demo.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic_ai.ag_ui import AgUiHandler
from .mcp_agent import agent

# MCP connections must be open for the agent's lifetime
# Use FastAPI lifespan to manage them
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with agent.run_mcp_servers():
        yield  # MCP servers stay connected during app lifetime

app = FastAPI(lifespan=lifespan)

@app.post("/api/mcp-demo")
async def mcp_demo(handler: AgUiHandler):
    async with handler.run(agent) as stream:
        async for event in stream:
            yield event  # tool calls to MCP tools emit TOOL_CALL_START/END normally
```

---

## Part 3 — Full Architecture v2

### Stack Overview

| Layer | Technology | Role |
|---|---|---|
| UI Primitives | `@assistant-ui/react` | Headless components — Thread, Message, Composer [cite:74] |
| AG-UI Runtime | `@assistant-ui/react-ag-ui` | Parses SSE events → React state [cite:36] |
| Protocol | AG-UI (SSE) | Standard event bus between frontend and backend |
| Agent Framework | Pydantic AI | Type-safe agent with `@agent.tool`, MCP client [cite:96] |
| Custom Tools | Python stdlib | Calculator, converter, datetime, formatter, random |
| Search | Tavily API | Real-time web search via `pydantic_ai.common_tools.tavily` |
| MCP Tools | MCP servers | Filesystem, crypto prices, any MCP-compliant server [cite:93] |
| API Server | FastAPI + Uvicorn | SSE endpoint, MCP lifespan management |
| Styling | Tailwind CSS + shadcn/ui | Design system [cite:86] |

### Updated Project Structure

```
agui-poc-v2/
├── backend/
│   ├── main.py                    ← FastAPI app, lifespan with MCP
│   ├── tools.py                   ← Custom tools + Tavily (unchanged from v1)
│   ├── mcp_agent.py               ← Agent with MCPServerStdio connections
│   ├── mcp_servers/
│   │   └── crypto_prices.py       ← Custom MCP server (FastMCP)
│   ├── routes/
│   │   ├── streaming.py
│   │   ├── tools_demo.py
│   │   └── mcp_demo.py            ← NEW: MCP demo route
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             ← AssistantRuntimeProvider wraps app
│   │   ├── providers.tsx          ← useAgUiRuntime + HttpAgent setup
│   │   └── demo/
│   │       ├── streaming/
│   │       ├── genui/
│   │       ├── hitl/
│   │       ├── shared-state/
│   │       ├── context/
│   │       ├── multi-step/
│   │       └── mcp/               ← NEW: MCP tools demo
│   │
│   ├── components/
│   │   ├── PremiumThread.tsx      ← NEW: full assistant-ui chat UI
│   │   ├── Sidebar.tsx            ← NEW: premium sidebar with thread list
│   │   ├── WelcomeScreen.tsx      ← NEW: empty state with suggestions
│   │   ├── ToolCallPart.tsx       ← NEW: inline tool call renderer
│   │   ├── ReasoningPart.tsx      ← NEW: collapsible thinking panel
│   │   ├── PremiumComposer.tsx    ← NEW: styled composer
│   │   ├── EventInspector.tsx     ← Raw AG-UI event stream (from v1)
│   │   └── ApprovalModal.tsx      ← HITL modal (from v1)
│   │
│   └── styles/
│       └── globals.css            ← Premium dark palette tokens
```

---

## Part 4 — v2 Use Case Additions

### UC 8 — MCP Tool Discovery Demo

**What it shows:** The agent connects to an MCP server at startup and dynamically discovers available tools. When the user asks about crypto prices or funding rates, the agent calls `get_crypto_price` or `get_funding_rate` from the custom MCP server — identical TOOL_CALL_START/END events fire in AG-UI, the frontend renders the same ToolCallPart component.

**Why it matters for your team:** Shows that the AG-UI event model is completely tool-source agnostic — custom `@agent.tool`, Tavily, and MCP tools all produce identical frontend events. The frontend doesn't need to know where a tool lives.

**Demo prompt:**
> *"What's the BTC funding rate and price? Calculate how much profit 0.5 BTC would make at this rate per day."*

This chains: `get_crypto_price` (MCP) → `get_funding_rate` (MCP) → `calculator` (custom) → `data_formatter` (custom) → Generative UI table.

### UC 9 — Filesystem via MCP

**What it shows:** Agent reads and writes files through the filesystem MCP server. Combined with HITL, this becomes a powerful demo — agent proposes to save data, user approves, agent writes via MCP.

**Demo prompt:**
> *"Save my conversation summary to a file called summary.txt"*

Agent: summarizes conversation → proposes save (INTERRUPT) → on approval, calls filesystem MCP `write_file` tool.

### UC 10 — UI Theme Switcher (Frontend Tool via assistant-ui)

**What it shows:** Agent calls a frontend tool that changes the UI theme (dark/light/midnight). This is possible because `@assistant-ui/react-ag-ui` handles frontend tool calls the same way CopilotKit does — the agent emits TOOL_CALL_START for a client-side action, the browser executes it.

**Demo prompt:**
> *"Switch to the midnight theme"*

---

## Part 5 — Build Timeline (v2 additions only)

| Phase | Duration | Deliverable |
|---|---|---|
| 6 — UI Migration | Day 1 (3h) | Install `@assistant-ui/react-ag-ui`, wire `useAgUiRuntime`, render existing demos with new `PremiumThread` |
| 7 — Design Polish | Day 2 (4h) | Full dark premium theme, WelcomeScreen, ToolCallPart, ReasoningPart, Composer |
| 8 — MCP Client | Day 3 (3h) | `mcp_agent.py` with MCPServerStdio, custom crypto MCP server, `/api/mcp-demo` route |
| 9 — MCP Demo UI | Day 3-4 (2h) | New `/demo/mcp` page, test UC 8 end-to-end |
| 10 — Polish + Event Inspector | Day 4-5 (2h) | AG-UI event inspector, sidebar thread list, suggestion chips, mobile responsive check |

**Total v2 additions: ~14 hours**  
**Combined v1 + v2: ~30 hours**

---

## Key Reference Links

| Resource | URL |
|---|---|
| assistant-ui AG-UI Runtime | https://www.assistant-ui.com/docs/runtimes/ag-ui/overview |
| assistant-ui Quickstart | https://www.assistant-ui.com/docs/runtimes/ag-ui/quickstart |
| ThreadPrimitive API | https://www.assistant-ui.com/docs/primitives/thread |
| MessagePrimitive API | https://www.assistant-ui.com/docs/api-reference/primitives/message |
| Pydantic AI MCP Docs | https://ai.pydantic.dev/mcp/server/ |
| Pydantic AI MCP Launch Post | https://pydantic.dev/articles/mcp-launch |
| Pydantic AI Built-in Tools (MCPServerTool) | https://ai.pydantic.dev/tools-toolsets/builtin-tools/ |
| FastMCP (quick MCP server) | https://github.com/jlowin/fastmcp |
| shadcn/ui | https://ui.shadcn.com |
| MCP Protocol Spec | https://modelcontextprotocol.io |
