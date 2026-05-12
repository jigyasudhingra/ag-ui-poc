# AG-UI POC — Complete Use Case Plan

**Project:** AG-UI × Pydantic AI Proof of Concept  
**Stack:** Pydantic AI (FastAPI backend) · CopilotKit React (frontend) · Tavily + Custom Tools  
**Goal:** Demonstrate the full spectrum of AG-UI capabilities to the team in a single, cohesive demo application.

---

## Overview

AG-UI (Agent–User Interaction Protocol) is an open, event-based protocol that standardizes how AI agents communicate with user-facing frontends over SSE (Server-Sent Events). It solves the M×N integration problem — instead of custom wiring between every agent framework and every UI, AG-UI provides a standard protocol with 16 typed events that any frontend can consume.

This POC covers **7 core use cases** and **6 tools** (1 Tavily + 5 custom) to demonstrate every major AG-UI pattern your team can ship in production.

---

## Protocol Quick Reference

| AG-UI Event | Direction | Purpose |
|---|---|---|
| `RUN_STARTED` | Agent → UI | Agent lifecycle starts |
| `RUN_FINISHED` | Agent → UI | Agent lifecycle ends |
| `TEXT_MESSAGE_CHUNK` | Agent → UI | Streams text tokens in real-time |
| `TOOL_CALL_START` | Agent → UI | Tool is being invoked |
| `TOOL_CALL_ARGS` | Agent → UI | Streams tool arguments |
| `TOOL_CALL_RESULT` | Agent → UI | Tool result available |
| `TOOL_CALL_END` | Agent → UI | Tool call complete |
| `STATE_DELTA` | Agent → UI | Partial shared state update |
| `STATE_SNAPSHOT` | Agent → UI | Full state sync |
| `STEP_STARTED` | Agent → UI | Multi-step agent sub-step begins |
| `STEP_FINISHED` | Agent → UI | Sub-step complete |
| `INTERRUPT` | Agent → UI | Agent pauses, awaits user input |
| `MESSAGES_SNAPSHOT` | UI → Agent | Sends full chat history + context |
| `CUSTOM` | Bidirectional | App-specific events (approvals, triggers) |

---

## Tools Inventory

### Tavily Web Search (3rd-Party)

```bash
uv add "pydantic-ai-slim[tavily]"
```

Built-in Pydantic AI integration via `pydantic_ai.common_tools.tavily.tavily_search_tool`. Pass the tool directly into `Agent(tools=[...])`. Requires `TAVILY_API_KEY` (free tier: 1,000 searches/month at app.tavily.com).

### Custom Tools (stdlib only — no extra packages)

| Tool | Function | Return Type |
|---|---|---|
| `calculator` | Safe arithmetic evaluator — add, subtract, multiply, divide, power | `CalcResult(expression, result, steps)` |
| `unit_converter` | Length (km/miles/m/ft), weight (kg/lbs), temperature (C/F) | `ConversionResult(from_value, to_value, category)` |
| `datetime_tool` | Current UTC time, day_of_week, days_until, days_since | `str` |
| `data_formatter` | JSON array or CSV string → structured table | `TableData(headers, rows, title)` |
| `random_generator` | number, UUID, pick from list, dice roll | `str` |

All custom tools are registered on a single Pydantic AI `Agent` instance alongside `tavily_search_tool`.

---

## Use Case 1 — Real-Time Streaming Chat

**AG-UI Events:** `RUN_STARTED` · `TEXT_MESSAGE_CHUNK` · `RUN_FINISHED`  
**Frontend Hook:** `<CopilotChat />`  
**Tools Used:** None (or Tavily for grounded answers)

The foundational AG-UI pattern. The Pydantic AI agent streams LLM tokens character-by-character to the React frontend. The frontend renders a typing indicator on `RUN_STARTED`, appends each chunk as `TEXT_MESSAGE_CHUNK` events arrive, and clears the indicator on `RUN_FINISHED`.

**What to implement:**
- Wire `CopilotChat` component to the `/api/streaming-chat` FastAPI route
- Add a `RUN_STARTED` handler that shows an animated "thinking" dot
- Customize the system prompt to make the agent respond in a way that feels noticeably streamed (longer, thoughtful responses)
- Layer in Tavily: if the user asks a real-world question, the agent calls `tavily_search_tool` first, then streams a grounded answer

**Demo prompt:**
> *"What is the AG-UI protocol and why does it matter for agentic frontends?"*

The agent streams a rich answer; if Tavily is triggered, the frontend first shows `TOOL_CALL_START` ("Searching web..."), then transitions seamlessly into the streamed text response.

---

## Use Case 2 — Generative UI (Agent-Rendered Components)

**AG-UI Events:** `TOOL_CALL_START` · `TOOL_CALL_ARGS` · `TOOL_CALL_END`  
**Frontend Hook:** `useCopilotAction` with `render:`  
**Tools Used:** `data_formatter`, `calculator`, `unit_converter`

When the agent invokes a tool, the frontend intercepts the `TOOL_CALL_END` event and renders a custom React component instead of plain text. The component renders "in-progress" while the tool runs, then switches to the final result — all without the user writing any agent-side UI code.

**What to implement:**
- Register `useCopilotAction` for `data_formatter` with a `render:` function that returns a `<DataTable>` component
- The `render` receives `{ args, status }` — use `status === "inProgress"` to show a skeleton loader, `status === "complete"` to show the real table
- Register a `render:` for `calculator` that shows an animated equation while the tool runs
- Register a `render:` for `unit_converter` that renders a styled conversion card

**Demo prompt:**
> *"Format this as a table: `[{"name":"Alice","score":95},{"name":"Bob","score":87},{"name":"Charlie","score":91}]`"*

The agent calls `data_formatter` → frontend renders a live `<DataTable>` component with headers and rows. The team sees that the agent is controlling what the UI renders.

---

## Use Case 3 — Human-in-the-Loop (Approval Interrupts)

**AG-UI Events:** `INTERRUPT` · `CUSTOM (approved/rejected)`  
**Frontend Hook:** Custom modal on `INTERRUPT` event  
**Tools Used:** `random_generator` (generates data), then pauses before a "save" action

The agent pauses mid-run using `ctx.interrupt()` inside a Pydantic AI tool. The frontend receives the `INTERRUPT` event and renders a confirmation modal. The user approves or rejects; the frontend sends a `CUSTOM` event back; the agent resumes or cancels.

**What to implement:**

Backend tool:
```python
@agent.tool
async def save_generated_data(ctx: RunContext, data: str) -> str:
    confirmation = await ctx.interrupt(
        message=f"Save this data to storage?\n\n{data[:200]}...",
        interrupt_type="confirmation"
    )
    if confirmation.approved:
        return "Data saved successfully."
    return "Save cancelled by user."
```

Frontend: listen for `INTERRUPT` event type, render an `<ApprovalModal>` with Approve / Reject buttons. On Approve, POST `{ type: "approved" }` back to the agent endpoint.

**Demo prompt:**
> *"Generate 5 UUIDs and save them."*

Agent generates UUIDs via `random_generator`, then pauses and asks "Save these 5 UUIDs?". User approves → agent confirms save. This clearly shows the "agent that asks before acting" pattern critical for production agentic apps.

---

## Use Case 4 — Frontend Tools (Agent Controls the Browser)

**AG-UI Events:** `TOOL_CALL_START` · `TOOL_CALL_END`  
**Frontend Hook:** `useCopilotAction` (client-side execution)  
**Tools Used:** Custom frontend-only tools (no backend logic)

Some tools are defined entirely on the frontend — the agent calls them, but they run in the browser. This lets the agent navigate routes, open modals, highlight elements, or change app state without any server round-trip.

**What to implement:**

```tsx
// Agent can call this to navigate the user to a different demo
useCopilotAction({
  name: "navigate_to_demo",
  description: "Navigate to a specific demo page",
  parameters: [{ name: "slug", type: "string" }],
  handler: async ({ slug }) => {
    router.push(`/demo/${slug}`);
  },
});

// Agent can highlight a DOM element
useCopilotAction({
  name: "highlight_element",
  description: "Add a glowing border to a DOM element",
  parameters: [{ name: "selector", type: "string" }],
  handler: async ({ selector }) => {
    const el = document.querySelector(selector);
    if (el) el.classList.add("agent-highlight");
  },
});
```

**Demo prompts:**
> *"Take me to the shared state demo."*  
> *"Highlight the navigation sidebar."*

The agent calls the frontend tool, and the UI responds immediately — no page reload, no server call. This pattern is powerful for AI copilots embedded inside existing dashboards.

---

## Use Case 5 — Shared State Sync (Bi-Directional)

**AG-UI Events:** `STATE_DELTA` · `STATE_SNAPSHOT`  
**Frontend Hook:** `useCoAgentStateRender`  
**Tools Used:** `data_formatter`, `calculator`

Both the agent and the frontend share a live state object. Either side can update it; AG-UI keeps both in sync. The agent emits `STATE_DELTA` to push incremental updates, and `STATE_SNAPSHOT` for full resyncs. The frontend renders optimistically — UI changes before the agent turn finishes.

**What to implement:**

Backend state model:
```python
class DashboardState(BaseModel):
    active_filter: str = "all"
    selected_metric: str = "revenue"
    calculation_result: float | None = None
    table_data: list[dict] | None = None
```

Frontend:
```tsx
const { state, setState } = useCoAgentStateRender<DashboardState>({
  name: "dashboard_state",
  render: ({ state }) => (
    <DashboardView
      filter={state.active_filter}
      metric={state.selected_metric}
      result={state.calculation_result}
    />
  ),
});
```

When the user types a chat command like "filter by Q1 revenue", the agent updates `active_filter` and `selected_metric` via `STATE_DELTA` — the dashboard re-renders immediately while the agent is still streaming its text response.

**Demo prompt:**
> *"Show me Q1 revenue, calculate the 10% growth target, and filter the table to 2024 only."*

The dashboard filters update in real-time as the agent processes the request — this is the clearest demonstration of AG-UI's "agent and UI share a brain" model.

---

## Use Case 6 — Context Enrichment (Frontend Injects UI Context)

**AG-UI Events:** `MESSAGES_SNAPSHOT` (enriched with readable context)  
**Frontend Hook:** `useCopilotReadable`  
**Tools Used:** Any — the point is the context, not the tool

The frontend continuously provides real-time context to the agent — current page, selected rows, active filters, user role, visible data. The agent's responses change based on what it "sees" in the UI, even without the user explicitly describing it.

**What to implement:**

```tsx
// Inject live dashboard state into every agent call
useCopilotReadable({
  description: "Current dashboard state",
  value: {
    page: "sales-dashboard",
    activeFilter: filter,
    selectedRows: selectedRows,
    visibleMetric: metric,
    userRole: "admin",
    rowCount: tableData.length,
  },
});

// Inject the currently visible table data
useCopilotReadable({
  description: "Data currently visible in the table",
  value: tableData.slice(0, 20), // top 20 rows
});
```

**Demo prompt:**
> *"Summarize what you can see right now."*

The agent accurately describes the current table, active filter, and selected metric — without the user saying anything about it. This immediately shows the team the power of context-aware agents embedded in real UIs.

---

## Use Case 7 — Multi-Step Agent with Visible Thinking

**AG-UI Events:** `STEP_STARTED` · `STEP_FINISHED` · `TOOL_CALL_START` × N  
**Frontend Hook:** Custom `<ThinkingPanel>` component  
**Tools Used:** `tavily_search_tool` → `calculator` → `data_formatter` (chained)

Chain multiple Pydantic AI agents or a single agent across multiple reasoning steps. Each step fires `STEP_STARTED` and `STEP_FINISHED`. The frontend renders a collapsible "Thinking..." panel that shows every step and tool call as they happen — full transparency into the agent's reasoning process.

**What to implement:**

Backend — chain three tools in sequence:
1. `tavily_search_tool` → fetch live BTC price
2. `calculator` → compute portfolio value (price × holdings)
3. `data_formatter` → format results as table

Frontend — render a `<ThinkingPanel>` component:
```tsx
// Collapse/expand the agent's reasoning steps
function ThinkingPanel({ steps }) {
  return (
    <details>
      <summary>🤔 Agent Thinking ({steps.length} steps)</summary>
      {steps.map((step, i) => (
        <div key={i} className={`step step--${step.status}`}>
          <span>{step.name}</span>
          {step.toolCalls.map(tc => <ToolCallBadge key={tc.id} tool={tc} />)}
        </div>
      ))}
    </details>
  );
}
```

Also add an **AG-UI Event Inspector** panel — a side drawer that shows every raw event in real-time as JSON. This is the single most effective tool for explaining the protocol to engineers on your team.

**Demo prompt:**
> *"Search BTC price, calculate what 0.35 BTC is worth, and show a full breakdown as a table."*

The team watches the thinking panel show: Step 1: Searching web → Step 2: Calculating → Step 3: Formatting table → Final result renders as a `<DataTable>` Generative UI component.

---

## Demo Prompts — Cheat Sheet

Use these exact prompts during the team walkthrough:

| Prompt | Tools Triggered | Use Case |
|---|---|---|
| `"What's the latest on AG-UI protocol?"` | `tavily_search` | UC 1 — Streaming + Search |
| `"What is 2^32? And what's 18% of that?"` | `calculator ×2` | UC 2 — Generative UI |
| `"Format this as a table: [{"name":"Alice","score":95}]"` | `data_formatter` | UC 2 — Generative UI table |
| `"Generate 5 UUIDs and save them"` | `random_generator` + interrupt | UC 3 — Human-in-the-Loop |
| `"Take me to the shared state demo"` | Frontend `navigate_to_demo` | UC 4 — Frontend Tools |
| `"Filter by Q1 and calculate 10% growth"` | `STATE_DELTA` | UC 5 — Shared State |
| `"Summarize what you can see right now"` | context from `useCopilotReadable` | UC 6 — Context Enrichment |
| `"Search BTC price, calculate 0.35 BTC value, show as table"` | `tavily` → `calculator` → `data_formatter` | UC 7 — Multi-Step Chain |
| `"Give me today's date, a UUID, and convert 100km to miles"` | 3 tools in parallel | UC 4 — Parallel Tool Calls |
| `"Roll 3 dice and format results as a table"` | `random_generator ×3` + `data_formatter` | UC 2 + UC 7 |

---

## Project Structure

```
agui-poc/
├── backend/
│   ├── main.py               ← FastAPI app + all AG-UI routes
│   ├── tools.py              ← All tools: Tavily + 5 custom
│   ├── agents/
│   │   ├── streaming.py      ← UC 1 agent
│   │   ├── hitl.py           ← UC 3 agent with ctx.interrupt()
│   │   └── multi_step.py     ← UC 7 chained agent
│   ├── .env                  ← OPENAI_API_KEY, TAVILY_API_KEY
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        ← CopilotKit provider wraps all routes
│   │   └── demo/
│   │       ├── streaming/page.tsx
│   │       ├── genui/page.tsx
│   │       ├── hitl/page.tsx
│   │       ├── frontend-tools/page.tsx
│   │       ├── shared-state/page.tsx
│   │       ├── context/page.tsx
│   │       └── multi-step/page.tsx
│   ├── components/
│   │   ├── ToolCallRenderer.tsx  ← useCopilotAction handlers for all tools
│   │   ├── DataTable.tsx         ← Generative UI table component
│   │   ├── ApprovalModal.tsx     ← HITL confirmation dialog
│   │   ├── ThinkingPanel.tsx     ← STEP_STARTED/FINISHED renderer
│   │   ├── EventInspector.tsx    ← Raw AG-UI event stream viewer
│   │   └── DashboardView.tsx     ← Shared state demo UI
│   └── package.json
```

---

## Setup Commands

```bash
# 1. Bootstrap (one time)
npx create-ag-ui-app --pydantic-ai

# 2. Backend deps
cd backend
uv add "pydantic-ai-slim[tavily]" fastapi uvicorn sse-starlette python-dotenv

# 3. Frontend deps
cd frontend
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

# 4. Environment
# backend/.env
OPENAI_API_KEY=sk-proj-...
TAVILY_API_KEY=tvly-...

# 5. Start both servers
uvicorn main:app --reload --port 8000   # Terminal 1
pnpm dev                                 # Terminal 2 → localhost:3000
```

---

## Key Reference Links

| Resource | URL |
|---|---|
| Pydantic AI AG-UI Docs | https://ai.pydantic.dev/integrations/ui/ag-ui/ |
| Pydantic AI Tools Docs | https://ai.pydantic.dev/tools/ |
| Tavily + Pydantic AI Integration | https://docs.tavily.com/documentation/integrations/pydantic-ai |
| AG-UI Protocol Spec | https://docs.ag-ui.com/introduction |
| CopilotKit React Hooks | https://docs.copilotkit.ai |
| AG-UI Dojo (live demos) | https://dojo.ag-ui.com/pydantic-ai |
| GitHub — ag-ui-protocol | https://github.com/ag-ui-protocol/ag-ui |

---

## Build Timeline

| Phase | Days | Deliverable |
|---|---|---|
| 1 — Setup & Scaffold | Day 1 (2h) | Working hello-world, 7-demo sidebar nav |
| 2 — UC1 + UC2 | Day 1–2 (4h) | Streaming chat + Generative UI table |
| 3 — UC3 + UC4 | Day 2–3 (4h) | HITL approval modal + frontend tools |
| 4 — UC5 + UC6 | Day 3–4 (3h) | Shared state dashboard + context injection |
| 5 — UC7 + Polish | Day 4–5 (3h) | Multi-step chain + event inspector + deploy |

Total estimated build time: **~16 hours across 5 days**.
