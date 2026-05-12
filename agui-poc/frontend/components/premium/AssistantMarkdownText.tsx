"use client";

import { MessagePartPrimitive, useMessagePartText } from "@assistant-ui/react";
import { useMemo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { preprocessForMath } from "@/components/premium/preprocessMath";

import "katex/dist/katex.min.css";

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-400 underline decoration-blue-400/40 underline-offset-2 hover:text-blue-300"
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-zinc-100 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-sm font-semibold text-zinc-100 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-medium text-zinc-200 first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-white/10" />,
  table: ({ children }) => (
    <div className="my-3 w-full min-w-0 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950/40">
      <table className="w-full min-w-[320px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.06] text-zinc-200">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-white/[0.06]">{children}</tr>,
  th: ({ children }) => (
    <th className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-zinc-300 tabular-nums">{children}</td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-md border border-white/10 bg-black/50 p-3 font-mono text-xs leading-relaxed text-zinc-300">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-cyan-200/90"
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function AssistantMarkdownText() {
  const part = useMessagePartText();
  const { text, status } = part;

  const processed = useMemo(() => preprocessForMath(text), [text]);

  return (
    <div className="min-w-0 text-sm leading-relaxed text-[var(--text-primary)] [&_.katex]:text-zinc-200 [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={mdComponents}
      >
        {processed}
      </ReactMarkdown>
      {status.type === "running" ? (
        <MessagePartPrimitive.InProgress>
          <span className="font-[family-name:var(--font-geist-mono)] text-zinc-500">
            {" \u25CF"}
          </span>
        </MessagePartPrimitive.InProgress>
      ) : null}
    </div>
  );
}
