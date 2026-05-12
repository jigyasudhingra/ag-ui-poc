"use client";

import { useCopilotAction } from "@copilotkit/react-core";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useCopilotAction({
    name: "navigate_to_demo",
    description:
      "Navigate to another demo page. Slugs: streaming, genui, hitl, frontend-tools, shared-state, context, multi-step.",
    parameters: [
      {
        name: "slug",
        type: "string",
        description: "Target slug after /demo/",
        required: true,
      },
    ],
    handler: async ({ slug }) => {
      router.push(`/demo/${slug}`);
    },
  });

  useCopilotAction({
    name: "highlight_element",
    description: "Temporarily highlight a DOM element (CSS selector).",
    parameters: [
      {
        name: "selector",
        type: "string",
        description: "CSS selector e.g. nav.agent-highlight-target",
        required: true,
      },
    ],
    handler: async ({ selector }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.add("agent-highlight");
      window.setTimeout(() => el.classList.remove("agent-highlight"), 4500);
    },
  });

  return (
    <p className="max-w-prose text-sm leading-relaxed text-zinc-400">
      Ask the assistant to navigate (e.g. “Take me to the shared state demo” →
      slug <code className="text-zinc-200">shared-state</code>) or highlight the
      sidebar using selector{" "}
      <code className="text-zinc-200">nav.agent-highlight-target</code>.
    </p>
  );
}
