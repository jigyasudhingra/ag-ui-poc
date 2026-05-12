'use client';

export interface DashboardState {
  active_filter: string;
  selected_metric: string;
  calculation_result: number | null;
  table_data: Record<string, unknown>[] | null;
}

export function DashboardView({
  filter,
  metric,
  result,
  rows,
}: {
  filter: string;
  metric: string;
  result: number | null;
  rows: Record<string, unknown>[] | null;
}) {
  const preview = rows?.slice(0, 8) ?? [];
  return (
    <div className="grid gap-4 rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">
          Filter: <strong>{filter}</strong>
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">
          Metric: <strong>{metric}</strong>
        </span>
        {result != null ? (
          <span className="rounded-full bg-emerald-950/60 px-3 py-1 text-emerald-200">
            Calculation: <strong>{result}</strong>
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-zinc-300">
          <thead>
            <tr>
              {preview[0]
                ? Object.keys(preview[0]).map((k) => (
                    <th key={k} className="border-b border-zinc-800 px-2 py-1">
                      {k}
                    </th>
                  ))
                : (
                  <th className="px-2 py-1 text-zinc-500">No rows yet</th>
                )}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-zinc-900">
                {Object.values(row).map((v, j) => (
                  <td key={j} className="px-2 py-1">
                    {String(v ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
