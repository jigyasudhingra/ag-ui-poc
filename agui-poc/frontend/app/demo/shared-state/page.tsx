'use client';

import { useCoAgentStateRender, useCopilotReadable } from '@copilotkit/react-core';
import { useMemo, useState } from 'react';

import type { DashboardState } from '@/components/DashboardView';
import { DashboardView } from '@/components/DashboardView';

const SAMPLE_ROWS: Record<string, unknown>[] = [
  { quarter: 'Q1', year: 2024, revenue: 120000 },
  { quarter: 'Q2', year: 2024, revenue: 132500 },
  { quarter: 'Q3', year: 2024, revenue: 128000 },
  { quarter: 'Q4', year: 2024, revenue: 141200 },
];

export default function Page() {
  const [uiFilter, setUiFilter] = useState('all');
  const [uiMetric, setUiMetric] = useState('revenue');

  const readableTable = useMemo(() => SAMPLE_ROWS, []);

  useCopilotReadable({
    description: 'Current dashboard UI controls (local)',
    value: {
      page: 'sales-dashboard',
      activeFilter: uiFilter,
      visibleMetric: uiMetric,
      userRole: 'admin',
      rowCount: readableTable.length,
    },
  });

  useCopilotReadable({
    description: 'Sample rows shown in the preview table',
    value: readableTable.slice(0, 12),
  });

  useCoAgentStateRender<DashboardState>({
    name: 'shared_state',
    render: ({ state }) => (
      <DashboardView
        filter={state.active_filter}
        metric={state.selected_metric}
        result={state.calculation_result}
        rows={state.table_data}
      />
    ),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <label className="flex items-center gap-2 text-zinc-400">
          Local filter
          <select
            value={uiFilter}
            onChange={(e) => setUiFilter(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
          >
            <option value="all">all</option>
            <option value="2024">2024</option>
            <option value="q1">Q1</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-zinc-400">
          Metric
          <select
            value={uiMetric}
            onChange={(e) => setUiMetric(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
          >
            <option value="revenue">revenue</option>
            <option value="growth">growth</option>
          </select>
        </label>
      </div>
      <DashboardView
        filter={uiFilter}
        metric={uiMetric}
        result={null}
        rows={readableTable}
      />
      <p className="text-xs text-zinc-500">
        Agent-emitted state updates merge via CopilotKit; chat prompts like “filter to Q1 and compute 10%
        growth target” should call backend tools and{' '}
        <code className="text-zinc-400">update_dashboard_state</code>.
      </p>
    </div>
  );
}
