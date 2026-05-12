"""UC7 — chained Tavily → calculator → formatter."""

from __future__ import annotations

from pydantic_ai import Agent, Tool

import tools as demo_tools


def build(model: str, *, tavily_key: str | None) -> Agent:
    tl = demo_tools.build_tavily_tool(tavily_key)
    base_tools = [
        Tool(demo_tools.calculator),
        Tool(demo_tools.data_formatter),
    ]
    if tl is not None:
        base_tools.insert(0, tl)
    return Agent(
        model,
        tools=base_tools,
        instructions=(
            'For portfolio or price breakdown requests: '
            '1) Use tavily_search to find a recent price when needed. '
            '2) Use calculator with explicit expressions for any arithmetic (e.g. price * quantity). '
            '3) Use data_formatter to show a clean markdown-ready table summary of inputs and results. '
            'Explain steps briefly as you go.'
        ),
    )
