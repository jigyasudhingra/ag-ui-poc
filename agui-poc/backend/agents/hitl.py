"""UC3 — backend prepares data; confirmation runs via frontend human-in-the-loop tool."""

from __future__ import annotations

from pydantic_ai import Agent, Tool

import tools as demo_tools


def build(model: str) -> Agent:
    return Agent(
        model,
        tools=[Tool(demo_tools.random_generator)],
        instructions=(
            'When the user asks to generate UUIDs (or random data) and save them: '
            '1) Call random_generator with mode "uuid" and count matching what they asked (default 5). '
            '2) Present the UUIDs clearly in your message. '
            '3) Then call the frontend tool save_generated_data with argument data containing '
            'the full text you showed the user so they can approve saving. '
            'Wait for the tool result before confirming cancellation or success to the user.'
        ),
    )
