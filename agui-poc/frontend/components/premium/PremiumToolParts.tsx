"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/core/react";

import { DataTable } from "@/components/DataTable";

import { parseMaybeJson } from "./parseToolPayload";

function ToolStatusPill({
  toolName,
  running,
}: {
  toolName: string;
  running: boolean;
}) {
  const toolIcons: Record<string, string> = {
    tavily_search_tool: "🔍",
    tavily_search: "🔍",
    calculator: "🧮",
    unit_converter: "📐",
    datetime_tool: "🕐",
    data_formatter: "📊",
    random_generator: "🎲",
    mcp_tool: "🔌",
    get_crypto_price: "₿",
    get_funding_rate: "📈",
  };
  const icon = toolIcons[toolName] ?? "🔧";
  return (
    <div
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${
        running
          ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      }`}
    >
      <span>{icon}</span>
      <span className="font-mono font-medium">{toolName}</span>
      {running ? <span>Running…</span> : <span>Done</span>}
    </div>
  );
}

export function DataFormatterTool(props: ToolCallMessagePartProps) {
  const busy = props.status?.type === "running";
  const raw = props.result ?? (props.args as { raw_data?: unknown })?.raw_data;
  const parsed =
    parseMaybeJson<{
      headers: string[];
      rows: unknown[][];
      title?: string;
    }>(raw) ??
    parseMaybeJson<{
      headers: string[];
      rows: unknown[][];
      title?: string;
    }>(typeof raw === "string" ? raw : null);
  if (busy && !parsed) {
    return (
      <div className="animate-pulse rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-4 py-8 text-sm text-zinc-400">
        Formatting table…
      </div>
    );
  }
  if (!parsed?.headers) {
    return (
      <div className="space-y-2">
        <ToolStatusPill toolName="data_formatter" running={busy} />
      </div>
    );
  }
  const rows = (parsed.rows ?? []).map((r) =>
    Array.isArray(r) ? r.map((c) => String(c ?? "")) : [],
  );
  return (
    <div className="space-y-2">
      {!busy ? <ToolStatusPill toolName="data_formatter" running={false} /> : null}
      <DataTable
        headers={parsed.headers}
        rows={rows}
        title={parsed.title ?? "Table"}
      />
    </div>
  );
}

export function CalculatorTool(props: ToolCallMessagePartProps) {
  const busy = props.status?.type === "running";
  const expr =
    (props.args as { expression?: string })?.expression ??
    parseMaybeJson<{ expression?: string }>(props.argsText)?.expression ??
    "";
  const payload = parseMaybeJson<{
    expression?: string;
    result?: number;
    steps?: string[];
  }>(props.result);
  if (busy) {
    return (
      <div className="space-y-2">
        <ToolStatusPill toolName="calculator" running />
        <div className="font-mono text-sm text-cyan-400/90 animate-pulse">
          Computing {expr || "…"}
        </div>
      </div>
    );
  }
  if (payload?.result === undefined && payload?.result !== 0) {
    return <ToolStatusPill toolName="calculator" running={false} />;
  }
  return (
    <div className="space-y-2">
      <ToolStatusPill toolName="calculator" running={false} />
      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 font-mono text-sm">
        <div className="text-zinc-400">{payload?.expression ?? expr}</div>
        <div className="text-lg font-semibold text-cyan-300">
          = {payload?.result}
        </div>
      </div>
    </div>
  );
}

export function UnitConverterTool(props: ToolCallMessagePartProps) {
  const busy = props.status?.type === "running";
  const payload = parseMaybeJson<{
    from_value?: number;
    to_value?: number;
    category?: string;
  }>(props.result);
  if (busy) {
    return (
      <div className="space-y-2">
        <ToolStatusPill toolName="unit_converter" running />
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 px-3 py-4 text-sm text-amber-200/80 animate-pulse">
          Converting…
        </div>
      </div>
    );
  }
  if (payload?.from_value === undefined || payload?.to_value === undefined) {
    return <ToolStatusPill toolName="unit_converter" running={false} />;
  }
  return (
    <div className="space-y-2">
      <ToolStatusPill toolName="unit_converter" running={false} />
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm">
        <div className="text-xs uppercase tracking-wide text-amber-400/80">
          {payload.category ?? "conversion"}
        </div>
        <div className="mt-1 text-lg font-semibold text-amber-100">
          {payload.from_value} → {payload.to_value.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

/** Fallback for MCP and other tools — shows pill + optional JSON result */
export function GenericToolCall(props: ToolCallMessagePartProps) {
  const busy = props.status?.type === "running";
  const { toolName } = props;
  return (
    <div className="flex flex-col gap-2 py-1">
      <ToolStatusPill toolName={toolName} running={busy} />
      {props.result != null && !busy ? (
        <pre className="max-h-40 overflow-auto rounded-md border border-white/[0.06] bg-black/20 p-2 text-[10px] leading-relaxed text-zinc-500">
          {typeof props.result === "string"
            ? props.result
            : JSON.stringify(props.result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export const premiumToolComponents = {
  by_name: {
    data_formatter: DataFormatterTool,
    calculator: CalculatorTool,
    unit_converter: UnitConverterTool,
    tavily_search_tool: GenericToolCall,
    datetime_tool: GenericToolCall,
    random_generator: GenericToolCall,
    mcp_tool: GenericToolCall,
  },
  Fallback: GenericToolCall,
} as const;
