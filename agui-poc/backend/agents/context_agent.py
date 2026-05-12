"""UC6 — rich toolset so readable context shows up in grounded answers."""

from __future__ import annotations

from pydantic_ai import Agent, Tool

import tools as demo_tools


def build(model: str, *, tavily_key: str | None) -> Agent:
    tl = demo_tools.build_tavily_tool(tavily_key)
    tools_list = [
        Tool(demo_tools.calculator),
        Tool(demo_tools.unit_converter),
        Tool(demo_tools.datetime_tool),
        Tool(demo_tools.data_formatter),
        Tool(demo_tools.random_generator),
    ]
    if tl is not None:
        tools_list.insert(0, tl)
    return Agent(
        model,
        tools=tools_list,
        instructions=(
            'You see injected context about the current UI from the frontend. '
            'When asked what you can see, summarize filters, metrics, and sample rows accurately. '
            'Use tools only when they help answer an explicit user question.'
        ),
    )
