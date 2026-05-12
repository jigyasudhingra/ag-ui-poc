"""Lightweight follow-up prompt suggestions for the premium thread."""

from __future__ import annotations

import json
import os
import re

from fastapi import APIRouter
from pydantic import BaseModel, Field
from pydantic_ai import Agent

router = APIRouter(tags=['suggestions'])

MODEL = os.getenv('SUGGESTIONS_MODEL', os.getenv('OPENAI_MODEL', 'openai:gpt-4o-mini'))

_suggestion_agent: Agent | None = None


class SuggestionRequest(BaseModel):
    last_message: str = Field(max_length=4000)


def _agent() -> Agent:
    global _suggestion_agent
    if _suggestion_agent is None:
        _suggestion_agent = Agent(
            MODEL,
            instructions=(
                'Generate exactly 3 short follow-up questions a user might ask after this assistant reply. '
                'Rules: max 8 words each; be specific to the content, not generic; '
                'vary: one factual, one analytical, one actionable. '
                'Reply with ONLY a JSON array of 3 strings. No markdown fence, no prose.'
            ),
        )
    return _suggestion_agent


def _parse_prompts(raw: str) -> list[str]:
    text = raw.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text)
    data = json.loads(text)
    if not isinstance(data, list):
        return []
    out: list[str] = []
    for item in data[:3]:
        if item is None:
            continue
        s = str(item).strip()
        if s:
            out.append(s)
    return out


@router.post('/api/suggestions')
async def post_suggestions(req: SuggestionRequest):
    if not os.getenv('OPENAI_API_KEY'):
        return []

    trimmed = req.last_message.strip()
    if not trimmed:
        return []

    try:
        result = await _agent().run(trimmed[:2000])
        prompts = _parse_prompts(result.output)
        return [{'prompt': p} for p in prompts]
    except (json.JSONDecodeError, ValueError, TypeError):
        return []
