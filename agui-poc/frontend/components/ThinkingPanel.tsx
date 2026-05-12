'use client';

import { useCopilotChat } from '@copilotkit/react-core';
import { useMemo } from 'react';

export function ThinkingPanel() {
  const { visibleMessages: vm } = useCopilotChat();
  const visibleMessages = useMemo(() => vm ?? [], [vm]);

  const lines = useMemo(() => {
    const msgs = visibleMessages as unknown[];
    return msgs.slice(-12).map((raw, i) => {
      const m = raw as { role?: string; content?: unknown };
      const role = m.role ?? '?';
      let preview = '';
      const c = m.content;
      if (typeof c === 'string') preview = c.slice(0, 120);
      else preview = JSON.stringify(c)?.slice(0, 160) ?? '';
      return { key: i + role + preview.slice(0, 20), role, preview };
    });
  }, [visibleMessages]);

  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-950/60">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-200">
        Agent activity ({visibleMessages.length} messages)
      </summary>
      <ul className="max-h-56 space-y-1 overflow-auto border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
        {lines.map((l) => (
          <li key={l.key}>
            <span className="font-semibold text-zinc-300">{l.role}</span>: {l.preview}
            {l.preview.length >= 120 ? '…' : ''}
          </li>
        ))}
      </ul>
    </details>
  );
}
