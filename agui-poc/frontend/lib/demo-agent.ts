/** URL segment under /demo → CopilotRuntime agent id (matches backend routes). */
export const DEMO_AGENT_IDS: Record<string, string> = {
  streaming: 'streaming',
  genui: 'genui',
  hitl: 'hitl',
  'frontend-tools': 'frontend_tools',
  'shared-state': 'shared_state',
  context: 'context',
  'multi-step': 'multi_step',
};

export function agentIdFromPath(pathname: string): string {
  const segment = pathname.replace(/^\/demo\/?/, '').split('/')[0] ?? 'streaming';
  return DEMO_AGENT_IDS[segment] ?? 'streaming';
}

export function demoTitles(segment: string): string {
  const m: Record<string, string> = {
    streaming: 'UC1 · Streaming',
    genui: 'UC2 · Generative UI',
    hitl: 'UC3 · Human in the loop',
    'frontend-tools': 'UC4 · Frontend tools',
    'shared-state': 'UC5 · Shared state',
    context: 'UC6 · Context',
    'multi-step': 'UC7 · Multi-step',
  };
  return m[segment] ?? 'AG-UI POC';
}
