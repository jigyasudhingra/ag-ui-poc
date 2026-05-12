"use client";

import { useCopilotAction } from "@copilotkit/react-core";

import { DataTable } from "@/components/DataTable";

function parseMaybeJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function ToolCallRenderer() {
  useCopilotAction({
    name: "data_formatter",
    available: "disabled",
    render: ({ args, status, result }) => {
      const busy = status === "inProgress";
      const raw = result ?? args.raw_data;
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
      if (!parsed?.headers) return <></>;
      const rows = (parsed.rows ?? []).map((r) =>
        Array.isArray(r) ? r.map((c) => String(c ?? "")) : [],
      );
      return (
        <DataTable
          headers={parsed.headers}
          rows={rows}
          title={parsed.title ?? "Table"}
        />
      );
    },
  });

  useCopilotAction({
    name: "calculator",
    available: "disabled",
    render: ({ args, status, result }) => {
      const busy = status === "inProgress";
      const expr = (args.expression as string) ?? "";
      const payload = parseMaybeJson<{
        expression?: string;
        result?: number;
        steps?: string[];
      }>(result);
      if (busy) {
        return (
          <div className="font-mono text-sm text-cyan-400/90 animate-pulse">
            Computing {expr || "…"}
          </div>
        );
      }
      if (!payload?.result && payload?.result !== 0) return <></>;
      return (
        <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 font-mono text-sm">
          <div className="text-zinc-400">{payload.expression ?? expr}</div>
          <div className="text-lg font-semibold text-cyan-300">
            = {payload.result}
          </div>
        </div>
      );
    },
  });

  useCopilotAction({
    name: "unit_converter",
    available: "disabled",
    render: ({ status, result }) => {
      const busy = status === "inProgress";
      const payload = parseMaybeJson<{
        from_value?: number;
        to_value?: number;
        category?: string;
      }>(result);
      if (busy) {
        return (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 px-3 py-4 text-sm text-amber-200/80 animate-pulse">
            Converting…
          </div>
        );
      }
      if (payload?.from_value === undefined || payload?.to_value === undefined)
        return <></>;
      return (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-amber-400/80">
            {payload.category ?? "conversion"}
          </div>
          <div className="mt-1 text-lg font-semibold text-amber-100">
            {payload.from_value} → {payload.to_value.toFixed(4)}
          </div>
        </div>
      );
    },
  });

  return null;
}
