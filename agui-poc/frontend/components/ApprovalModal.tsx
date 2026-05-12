"use client";

export function ApprovalModal(props: {
  args: { data?: string };
  status: string;
  respond?: (result: unknown) => void | Promise<void>;
}) {
  const { args, status, respond } = props;
  const data = args.data ?? "";

  if (status === "inProgress") {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-400">
        Preparing confirmation…
      </div>
    );
  }

  if (status !== "executing" || !respond) return null;

  return (
    <div className="rounded-xl border border-violet-800/60 bg-violet-950/40 p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-violet-100">
        Save generated data?
      </h3>
      <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/40 p-2 text-xs text-zinc-300 whitespace-pre-wrap">
        {data.slice(0, 2000)}
        {data.length > 2000 ? "\n…" : ""}
      </pre>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          onClick={() => respond({ approved: true, saved: true })}
        >
          Approve save
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          onClick={() => respond({ approved: false })}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
