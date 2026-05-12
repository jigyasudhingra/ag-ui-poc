"""UC2 — tools whose results render as Generative UI."""

from __future__ import annotations

from pydantic_ai import Agent, Tool

import ag_ui_hitl_tools
import tools as demo_tools


def build(model: str) -> Agent:
    return Agent(
        model,
        tools=[
            Tool(demo_tools.calculator),
            Tool(demo_tools.unit_converter),
            Tool(demo_tools.data_formatter),
            Tool(ag_ui_hitl_tools.demo_send_email),
            Tool(ag_ui_hitl_tools.ask_user_input),
            Tool(ag_ui_hitl_tools.demo_delete_file),
        ],
        instructions=(
            'Use tools for calculations, conversions, and tables. '
            'Prefer data_formatter when the user provides JSON arrays or CSV for tabular data. '
            'For human-in-the-loop demos on this page: if the user asks to send or draft an email, '
            'use demo_send_email with plausible to/subject/preview. If they ask to delete a file, '
            'use demo_delete_file with a path and size_kb. If you need one missing field from the user, '
            'use ask_user_input with field_type text, number, or date.'
        ),
    )
