"""UC2 — tools whose results render as Generative UI."""

from __future__ import annotations

from pydantic_ai import Agent, Tool

import tools as demo_tools


def build(model: str) -> Agent:
    return Agent(
        model,
        tools=[
            Tool(demo_tools.calculator),
            Tool(demo_tools.unit_converter),
            Tool(demo_tools.data_formatter),
        ],
        instructions=(
            'Use tools for calculations, conversions, and tables. '
            'Prefer data_formatter when the user provides JSON arrays or CSV for tabular data.'
        ),
    )
