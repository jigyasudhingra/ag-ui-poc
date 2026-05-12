"use client";

import type { UseAgUiRuntimeOptions } from "@assistant-ui/react-ag-ui";
import { AgUiThreadRuntimeCore } from "../node_modules/@assistant-ui/react-ag-ui/dist/runtime/AgUiThreadRuntimeCore.js";
import { makeLogger } from "../node_modules/@assistant-ui/react-ag-ui/dist/runtime/logger.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
  useToolInvocations,
} from "@assistant-ui/core/react";
import type { ToolExecutionStatus } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessage,
  ThreadSuggestion,
} from "@assistant-ui/core";

export type UseAgUiRuntimeWithSuggestionsOptions = UseAgUiRuntimeOptions & {
  suggestionGenerate?: (options: {
    messages: readonly ThreadMessage[];
  }) => Promise<readonly ThreadSuggestion[]>;
};

export function useAgUiRuntimeWithSuggestions(
  options: UseAgUiRuntimeWithSuggestionsOptions,
): AssistantRuntime {
  const logger = useMemo(() => makeLogger(options.logger), [options.logger]);
  const [_version, setVersion] = useState(0);
  const notifyUpdate = useCallback(() => setVersion((v) => v + 1), []);
  const runtimeAdapters = useRuntimeAdapters();

  const historyAdapter = options.adapters?.history ?? runtimeAdapters?.history;
  const threadListAdapter = options.adapters?.threadList;

  const [core] = useState(
    () =>
      new AgUiThreadRuntimeCore({
        agent: options.agent,
        logger,
        showThinking: options.showThinking ?? true,
        ...(options.onError && { onError: options.onError }),
        ...(options.onCancel && { onCancel: options.onCancel }),
        ...(historyAdapter && { history: historyAdapter }),
        notifyUpdate,
      }),
  );

  useEffect(() => {
    core.updateOptions({
      agent: options.agent,
      logger,
      showThinking: options.showThinking ?? true,
      ...(options.onError && { onError: options.onError }),
      ...(options.onCancel && { onCancel: options.onCancel }),
      ...(historyAdapter && { history: historyAdapter }),
    });
  }, [
    core,
    options.agent,
    options.onError,
    options.onCancel,
    options.showThinking,
    logger,
    historyAdapter,
  ]);

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );

  const [suggestions, setSuggestions] = useState<readonly ThreadSuggestion[]>(
    [],
  );
  const wasRunningRef = useRef(false);
  const suggestGen = options.suggestionGenerate;

  useEffect(() => {
    const running = core.isRunning() || hasExecutingTools;
    const msgs = core.getMessages();
    const last = msgs.at(-1);
    const assistantTurnDone =
      last?.role === "assistant" && last.status?.type === "complete";

    if (
      wasRunningRef.current &&
      !running &&
      suggestGen &&
      !core.isLoading &&
      assistantTurnDone
    ) {
      let cancelled = false;
      void suggestGen({ messages: msgs }).then((r) => {
        if (!cancelled) setSuggestions(r);
      });
      wasRunningRef.current = running;
      return () => {
        cancelled = true;
      };
    }
    wasRunningRef.current = running;
    return undefined;
  }, [_version, hasExecutingTools, core, suggestGen]);

  const [runtimeRef] = useState(() => ({
    get current(): AssistantRuntime {
      return runtime;
    },
  }));

  const toolInvocationsRef = useRef<{
    reset: () => void;
    abort: () => Promise<void>;
    resume: (toolCallId: string, payload: unknown) => void;
  }>({
    reset: () => {},
    abort: (): Promise<void> => Promise.resolve(),
    resume: () => {},
  });

  const threadList = useMemo(() => {
    if (!threadListAdapter) return undefined;

    const { onSwitchToNewThread, onSwitchToThread } = threadListAdapter;

    return {
      threadId: threadListAdapter.threadId,
      onSwitchToNewThread: onSwitchToNewThread
        ? async () => {
            toolInvocationsRef.current.reset();
            await onSwitchToNewThread();
            core.applyExternalMessages([]);
            setSuggestions([]);
          }
        : undefined,
      onSwitchToThread: onSwitchToThread
        ? async (threadId: string) => {
            toolInvocationsRef.current.reset();
            const result = await onSwitchToThread(threadId);
            core.applyExternalMessages(result.messages);
            setSuggestions([]);
            if (result.state) {
              core.loadExternalState(result.state);
            }
          }
        : undefined,
    };
  }, [threadListAdapter, core]);

  const adapters = options.adapters;
  const adapterAdapters = useMemo(
    () => ({
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      feedback: adapters?.feedback,
      threadList,
    }),
    [adapters, runtimeAdapters, threadList],
  );

  const toolInvocations = useToolInvocations({
    state: {
      messages: core.getMessages(),
      isRunning: core.isRunning() || hasExecutingTools,
    },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command) => {
      if (command.type === "add-tool-result") {
        const messageId = core.findMessageIdForToolCall(command.toolCallId);
        if (messageId) {
          core.addToolResult({
            messageId,
            toolCallId: command.toolCallId,
            toolName: command.toolName,
            result: command.result,
            isError: command.isError,
            ...(command.artifact && { artifact: command.artifact }),
          });
        }
      }
    },
    setToolStatuses,
  });
  // Sync with @assistant-ui/react-ag-ui useAgUiRuntime (tool callbacks need latest invocation).
  // eslint-disable-next-line react-hooks/refs -- intentional ref sync during render
  toolInvocationsRef.current = toolInvocations;

  const store = useMemo(() => {
    void _version;

    const clearSuggestions = () => setSuggestions([]);

    return {
      isLoading: core.isLoading,
      messages: core.getMessages(),
      state: core.getState(),
      isRunning: core.isRunning() || hasExecutingTools,
      suggestions,
      onNew: async (message: AppendMessage) => {
        clearSuggestions();
        await core.append(message);
      },
      onEdit: async (message: AppendMessage) => {
        clearSuggestions();
        await core.edit(message);
      },
      onReload: async (
        parentId: string | null,
        config: { runConfig?: { custom?: Record<string, unknown> } },
      ) => {
        clearSuggestions();
        await core.reload(parentId, config);
      },
      onCancel: async () => {
        core.cancel();
        await toolInvocationsRef.current.abort();
      },
      onAddToolResult: (opts: Parameters<typeof core.addToolResult>[0]) =>
        core.addToolResult(opts),
      onResume: (config: Parameters<typeof core.resume>[0]) =>
        core.resume(config),
      onResumeToolCall: (opts: { toolCallId: string; payload: unknown }) =>
        toolInvocationsRef.current.resume(opts.toolCallId, opts.payload),
      setMessages: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      onImport: (messages: readonly ThreadMessage[]) =>
        core.applyExternalMessages(messages),
      onLoadExternalState: (state) => core.loadExternalState(state),
      adapters: adapterAdapters,
    } satisfies ExternalStoreAdapter<ThreadMessage>;
  }, [adapterAdapters, core, _version, hasExecutingTools, suggestions]);

  const runtime = useExternalStoreRuntime(store);

  useEffect(() => {
    core.attachRuntime(runtime);
    return () => {
      core.detachRuntime();
    };
  }, [core, runtime]);

  useEffect(() => {
    void core.__internal_load();
  }, [core]);

  return runtime;
}
