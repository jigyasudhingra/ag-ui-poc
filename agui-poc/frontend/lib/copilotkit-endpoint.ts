import { HttpAgent } from '@ag-ui/client';
import { CopilotRuntime, createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';

import { getBackendBase } from '@/lib/backend-url';

const backend = getBackendBase();

const runtime = new CopilotRuntime({
  agents: {
    streaming: new HttpAgent({ url: `${backend}/api/streaming-chat` }),
    genui: new HttpAgent({ url: `${backend}/api/genui` }),
    hitl: new HttpAgent({ url: `${backend}/api/hitl` }),
    frontend_tools: new HttpAgent({ url: `${backend}/api/frontend-tools` }),
    shared_state: new HttpAgent({ url: `${backend}/api/shared-state` }),
    context: new HttpAgent({ url: `${backend}/api/context` }),
    multi_step: new HttpAgent({ url: `${backend}/api/multi-step` }),
    mcp_demo: new HttpAgent({ url: `${backend}/api/mcp-demo` }),
  },
});

const basePath = '/api/copilotkit';

/** REST-style routes (GET /threads, POST /threads/subscribe, …). */
const multiRouteHandler = createCopilotRuntimeHandler({
  runtime,
  basePath,
  mode: 'multi-route',
  cors: true,
});

/** JSON envelope POST used by the CopilotKit client for agent runs. */
const singleRouteHandler = createCopilotRuntimeHandler({
  runtime,
  basePath,
  mode: 'single-route',
  cors: true,
});

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function dispatchCopilotKitRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = normalizePathname(url.pathname);

  const useSingleRouteEnvelope = req.method === 'POST' && path === basePath;

  if (useSingleRouteEnvelope) {
    return singleRouteHandler(req);
  }
  return multiRouteHandler(req);
}
