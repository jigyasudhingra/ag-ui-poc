"""UC5 — shared dashboard state (STATE_SNAPSHOT via tools)."""

from __future__ import annotations

import json

from ag_ui.core import EventType, StateSnapshotEvent
from pydantic_ai import Agent, RunContext, Tool, ToolReturn

from pydantic_ai.ui import StateDeps

import tools as demo_tools
from state_models import DashboardState


def build(model: str) -> Agent:
    agent = Agent(
        model,
        deps_type=StateDeps[DashboardState],
        tools=[
            Tool(demo_tools.calculator),
            Tool(demo_tools.unit_converter),
            Tool(demo_tools.data_formatter),
        ],
        instructions=(
            'You control a sales dashboard state. When the user asks to filter metrics or update '
            'the view, call update_dashboard_state with the appropriate fields. '
            'Use calculator / unit_converter / data_formatter when they ask for math or tables. '
            'For calculator, pass a single arithmetic string only (e.g. "132500 * 0.10"), never '
            'natural language or mixed prose — rewrite percentages as decimals first. '
            'After computing values you may push calculation_result and table_data derived from tools.'
        ),
    )

    @agent.tool
    async def update_dashboard_state(
        ctx: RunContext[StateDeps[DashboardState]],
        active_filter: str | None = None,
        selected_metric: str | None = None,
        calculation_result: float | None = None,
        table_json: str | None = None,
    ) -> ToolReturn:
        st = ctx.deps.state
        updates: dict = {}
        if active_filter is not None:
            updates['active_filter'] = active_filter
        if selected_metric is not None:
            updates['selected_metric'] = selected_metric
        if calculation_result is not None:
            updates['calculation_result'] = calculation_result
        if table_json is not None:
            try:
                parsed = demo_tools.data_formatter(table_json, title='Dashboard')
                rows_as_dicts = [
                    dict(zip(parsed.headers, row, strict=False)) for row in parsed.rows
                ]
                updates['table_data'] = rows_as_dicts
            except (ValueError, json.JSONDecodeError) as e:
                new_state = st.model_copy(update=updates)
                ctx.deps.state = new_state
                return ToolReturn(
                    return_value=f'Dashboard updated except table: invalid table_json ({e}).',
                    metadata=[
                        StateSnapshotEvent(
                            type=EventType.STATE_SNAPSHOT,
                            snapshot=new_state.model_dump(mode='json'),
                        )
                    ],
                )
        new_state = st.model_copy(update=updates)
        ctx.deps.state = new_state
        return ToolReturn(
            return_value='Dashboard state updated.',
            metadata=[
                StateSnapshotEvent(
                    type=EventType.STATE_SNAPSHOT,
                    snapshot=new_state.model_dump(mode='json'),
                )
            ],
        )

    return agent
