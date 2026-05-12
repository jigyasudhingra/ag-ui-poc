'use client';

import { useCopilotReadable } from '@copilotkit/react-core';
import { useAssistantInstructions } from '@assistant-ui/react';
import { useMemo, useState } from 'react';

export default function Page() {
  const [filter, setFilter] = useState('2024-Q4');
  const [metric, setMetric] = useState('pipeline');
  const rows = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i + 1,
        owner: `Rep ${i + 1}`,
        amount: 10000 + i * 1337,
        stage: i % 2 === 0 ? 'Qualified' : 'Negotiation',
      })),
    [],
  );

  useAssistantInstructions(
    useMemo(
      () =>
        `User's current dashboard context (mock CRM): activeFilter=${filter}, visibleMetric=${metric}, userRole=admin, rowCount=${rows.length}, previewRows=${JSON.stringify(rows.slice(0, 3))}. Reference this when summarizing what is on screen.`,
      [filter, metric, rows],
    ),
  );

  useCopilotReadable({
    description: 'Current CRM dashboard slice',
    value: {
      page: 'sales-dashboard',
      activeFilter: filter,
      visibleMetric: metric,
      userRole: 'admin',
      selectedRows: rows.slice(0, 3),
      rowCount: rows.length,
    },
  });

  useCopilotReadable({
    description: 'Rows visible in the mock CRM table',
    value: rows,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <label className="flex flex-col gap-1">
          Filter
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1">
          Metric
          <input
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Owner</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-900">
                <td className="px-2 py-1">{r.id}</td>
                <td className="px-2 py-1">{r.owner}</td>
                <td className="px-2 py-1">{r.amount}</td>
                <td className="px-2 py-1">{r.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Ask the copilot to summarize what it sees—the readable context updates live without repeating UI state in every prompt.
      </p>
    </div>
  );
}
