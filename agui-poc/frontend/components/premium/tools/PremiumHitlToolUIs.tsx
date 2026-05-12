"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ToolCallMessagePartProps } from "@assistant-ui/core/react";
import { useState } from "react";

type PlanArgs = { steps: string[]; action_summary: string };
type PlanResult = { approved: boolean; modified_steps?: string[] };

function PlanApprovalToolPanel(
  props: ToolCallMessagePartProps<PlanArgs, PlanResult>,
) {
  const { args, addResult, status, result } = props;
  const [steps, setSteps] = useState(() => args.steps ?? []);

  if (status.type === "complete" && result != null) {
    const r = result as { approved?: boolean; modified_steps?: string[] };
    const approved = r.approved === true;
    const n = approved ? (r.modified_steps?.length ?? steps.length) : 0;
    return (
      <div
        className={`my-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          approved
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-white/[0.08] bg-zinc-800/50 text-zinc-500"
        }`}
      >
        {approved ? "✓ Plan approved" : "✗ Plan cancelled"}
        {approved ? (
          <span className="text-zinc-600">
            — {n} step{n === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111115]">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span className="text-amber-400" aria-hidden>
          ⚡
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-200">Proposed Plan</p>
          <p className="mt-0.5 text-xs text-zinc-600">{args.action_summary}</p>
        </div>
        <span className="font-mono text-xs text-zinc-700">{steps.length} steps</span>
      </div>
      <ol className="space-y-2.5 px-4 py-3">
        {steps.map((step, i) => (
          <li key={i} className="group/step flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-zinc-800 font-mono text-[10px] text-zinc-500">
              {i + 1}
            </span>
            <span className="flex-1 text-sm leading-snug text-zinc-300">{step}</span>
            <button
              type="button"
              title="Remove step"
              onClick={() => setSteps((s) => s.filter((_, j) => j !== i))}
              className="mt-0.5 shrink-0 text-zinc-700 opacity-0 transition-all group-hover/step:opacity-100 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      {steps.length === 0 ? (
        <p className="px-4 pb-3 text-xs italic text-zinc-600">
          All steps removed. Cancel or adjust the plan.
        </p>
      ) : null}
      <div className="flex gap-2 border-t border-white/[0.06] px-4 py-3">
        <button
          type="button"
          disabled={steps.length === 0}
          onClick={() => addResult({ approved: true, modified_steps: steps })}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Execute Plan
        </button>
        <button
          type="button"
          onClick={() => addResult({ approved: false })}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 transition-all hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export const PlanApprovalToolUI = makeAssistantToolUI<PlanArgs, PlanResult>({
  toolName: "present_plan",
  render: PlanApprovalToolPanel,
});

export const SendEmailToolUI = makeAssistantToolUI<
  { to: string; subject: string; preview: string },
  { approved: boolean }
>({
  toolName: "demo_send_email",
  render: ({ args, addResult, status, result }) => {
    if (status.type === "complete" && result != null) {
      const approved = (result as { approved?: boolean }).approved === true;
      return (
        <div
          className={`my-1 rounded-lg border px-3 py-2 text-xs ${
            approved
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.08] bg-zinc-800/50 text-zinc-500"
          }`}
        >
          {approved ? `✓ Email sent to ${args.to}` : "✗ Email not sent"}
        </div>
      );
    }

    return (
      <div className="my-2 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
        <div className="flex items-center gap-2 border-b border-amber-500/10 px-4 py-3">
          <span className="text-amber-400" aria-hidden>
            ⚠
          </span>
          <span className="text-sm font-semibold text-amber-300">Confirm action</span>
        </div>
        <div className="space-y-1.5 px-4 py-3 text-sm">
          <div>
            <span className="text-zinc-600">To </span>
            <span className="text-zinc-200">{args.to}</span>
          </div>
          <div>
            <span className="text-zinc-600">Subject </span>
            <span className="text-zinc-200">{args.subject}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-500">
            {args.preview}
          </p>
        </div>
        <div className="flex gap-2 border-t border-amber-500/10 px-4 py-3">
          <button
            type="button"
            onClick={() => addResult({ approved: true })}
            className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black transition-all hover:bg-amber-400"
          >
            Send Email
          </button>
          <button
            type="button"
            onClick={() => addResult({ approved: false })}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  },
});

type AskArgs = {
  question: string;
  field_name: string;
  field_type: "text" | "number" | "date";
};
type AskResult = { value: string };

function MissingInfoToolPanel(
  props: ToolCallMessagePartProps<AskArgs, AskResult>,
) {
  const { args, addResult, status, result } = props;
  const [value, setValue] = useState("");
  if (status.type === "complete" && result != null) {
    const v = String((result as { value?: string }).value ?? "");
    return (
      <div className="my-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
        ✓ {v || "—"}
      </div>
    );
  }

  const inputType =
    args.field_type === "date"
      ? "date"
      : args.field_type === "number"
        ? "number"
        : "text";

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/[0.04]">
      <div className="border-b border-blue-500/10 px-4 py-3">
        <p className="text-sm text-zinc-200">{args.question}</p>
      </div>
      <div className="flex gap-2 px-4 py-3">
        <input
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${args.field_name}…`}
          className="flex-1 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-blue-500/50"
        />
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => addResult({ value })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

export const MissingInfoToolUI = makeAssistantToolUI<AskArgs, AskResult>({
  toolName: "ask_user_input",
  render: MissingInfoToolPanel,
});

type DelArgs = { path: string; size_kb: number };
type DelResult = { confirmed: boolean };

function DeleteFileToolPanel(props: ToolCallMessagePartProps<DelArgs, DelResult>) {
  const { args, addResult, status, result } = props;
  const [typed, setTyped] = useState("");
  const filename = args.path.split("/").at(-1) ?? args.path;

  if (status.type === "complete" && result != null) {
    const confirmed = (result as { confirmed?: boolean }).confirmed === true;
    return (
      <div
        className={`my-1 rounded-lg border px-3 py-2 text-xs ${
          confirmed
            ? "border-red-500/30 bg-red-500/10 text-red-300"
            : "border-white/[0.08] bg-zinc-800/50 text-zinc-500"
        }`}
      >
        {confirmed ? `Deleted: ${filename}` : "Deletion cancelled"}
      </div>
    );
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-red-500/30 bg-red-500/[0.04]">
      <div className="flex items-center gap-2 border-b border-red-500/10 px-4 py-3">
        <span className="text-red-400" aria-hidden>
          🗑
        </span>
        <span className="text-sm font-semibold text-red-300">Destructive action</span>
      </div>
      <div className="space-y-2 px-4 py-3">
        <p className="text-sm text-zinc-300">
          Permanently delete{" "}
          <code className="rounded bg-red-500/10 px-1 text-red-300">{filename}</code>
          <span className="ml-1 text-zinc-600">({args.size_kb} KB)</span>
        </p>
        <p className="text-xs text-zinc-600">
          This cannot be undone. Type the filename to confirm.
        </p>
        <input
          type="text"
          placeholder={filename}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-red-500/50"
        />
      </div>
      <div className="flex gap-2 border-t border-red-500/10 px-4 py-3">
        <button
          type="button"
          disabled={typed !== filename}
          onClick={() => addResult({ confirmed: true })}
          className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Delete permanently
        </button>
        <button
          type="button"
          onClick={() => addResult({ confirmed: false })}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export const DeleteFileToolUI = makeAssistantToolUI<DelArgs, DelResult>({
  toolName: "demo_delete_file",
  render: DeleteFileToolPanel,
});

export function PremiumHitlToolUIs() {
  return (
    <>
      <PlanApprovalToolUI />
      <SendEmailToolUI />
      <MissingInfoToolUI />
      <DeleteFileToolUI />
    </>
  );
}
