/** URL segment under /demo → CopilotRuntime agent id (matches backend routes). */
export const DEMO_AGENT_IDS: Record<string, string> = {
  streaming: 'streaming',
  genui: 'genui',
  hitl: 'hitl',
  'frontend-tools': 'frontend_tools',
  'shared-state': 'shared_state',
  context: 'context',
  'multi-step': 'multi_step',
  mcp: 'mcp_demo',
};

/** Agent id → FastAPI AG-UI POST path (after backend base URL). */
export const AG_UI_API_PATHS: Record<string, string> = {
  streaming: '/api/streaming-chat',
  genui: '/api/genui',
  hitl: '/api/hitl',
  frontend_tools: '/api/frontend-tools',
  shared_state: '/api/shared-state',
  context: '/api/context',
  multi_step: '/api/multi-step',
  mcp_demo: '/api/mcp-demo',
};

export function agentApiPathFromPathname(pathname: string): string {
  const id = agentIdFromPath(pathname);
  return AG_UI_API_PATHS[id] ?? '/api/streaming-chat';
}

export function demoSegmentFromPath(pathname: string): string {
  return pathname.replace(/^\/demo\/?/, '').split('/')[0] || 'streaming';
}

/** Demos that still rely on CopilotKit hooks (HITL, actions, shared state). */
export const LEGACY_COPILOT_SIDEBAR_SEGMENTS = new Set([
  'hitl',
  'frontend-tools',
  'shared-state',
]);

export function usesLegacyCopilotSidebar(segment: string): boolean {
  return LEGACY_COPILOT_SIDEBAR_SEGMENTS.has(segment);
}

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
    mcp: 'UC8 · MCP tools',
  };
  return m[segment] ?? 'AG-UI POC';
}
