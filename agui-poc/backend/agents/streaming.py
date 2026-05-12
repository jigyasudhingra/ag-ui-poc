"""UC1 — streaming chat (+ optional Tavily)."""

from __future__ import annotations

from pydantic_ai import Agent

import tools as demo_tools


def build(model: str, *, tavily_key: str | None) -> Agent:
    tl = demo_tools.build_tavily_tool(tavily_key)
    tool_list: list = []
    if tl is not None:
        tool_list.append(tl)
    return Agent(
        model,
        tools=tool_list,
        instructions=(
            'You are an articulate assistant demonstrating streamed responses. '
            'Write clear, structured answers with enough depth that streaming is noticeable. '
            'For current facts or news, call the tavily_search tool first, then synthesize.'
        ),
    )
