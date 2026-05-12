"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { HttpAgent } from "@ag-ui/client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { agentApiPathFromPathname } from "@/lib/demo-agent";
import { getBackendBase } from "@/lib/backend-url";

export function AgUiRuntimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/demo/streaming";
  const backend = getBackendBase();
  const apiPath = agentApiPathFromPathname(pathname);

  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${backend.replace(/\/$/, "")}${apiPath}`,
      }),
    [backend, apiPath],
  );

  const runtime = useAgUiRuntime({
    agent,
    showThinking: true,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
