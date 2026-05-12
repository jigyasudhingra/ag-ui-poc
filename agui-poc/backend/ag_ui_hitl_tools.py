"""AG-UI chat tools that defer to the frontend (CallDeferred) for human approval / input."""

from __future__ import annotations

from typing import Any

from pydantic_ai import CallDeferred
from pydantic_ai.tools import RunContext


async def present_plan(
    ctx: RunContext,
    steps: list[str],
    action_summary: str,
) -> dict[str, Any]:
    """Present a numbered plan in the chat UI and wait for approval.

    When the workflow needs three or more distinct steps (searches, calculations, tables),
    call this first with clear step strings. After the user approves, continue with only
    the approved steps (use modified steps if the user removed any).
    """
    raise CallDeferred()


async def demo_send_email(
    ctx: RunContext,
    to: str,
    subject: str,
    preview: str,
) -> dict[str, Any]:
    """Simulated email send. The user confirms or cancels in the chat UI."""
    raise CallDeferred()


async def ask_user_input(
    ctx: RunContext,
    question: str,
    field_name: str,
    field_type: str,
) -> dict[str, Any]:
    """Ask the user for a single value. field_type must be one of: text, number, date."""
    raise CallDeferred()


async def demo_delete_file(
    ctx: RunContext,
    path: str,
    size_kb: float,
) -> dict[str, Any]:
    """Simulated destructive delete. The user must confirm in the chat UI."""
    raise CallDeferred()
