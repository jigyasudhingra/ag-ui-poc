"""UC8 — MCP crypto tools + calculator + table formatter."""

from __future__ import annotations

import sys
from pathlib import Path

from pydantic_ai import Agent, Tool
from pydantic_ai.mcp import MCPServerStdio

import tools as demo_tools

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def build(model: str) -> Agent:
    """Agent with stdio MCP crypto server plus local tools for chaining."""
    mcp_crypto = MCPServerStdio(
        sys.executable,
        ['-m', 'mcp_servers.crypto_prices'],
        cwd=str(_BACKEND_ROOT),
    )
    return Agent(
        model,
        tools=[Tool(demo_tools.calculator), Tool(demo_tools.data_formatter)],
        mcp_servers=[mcp_crypto],
        instructions=(
            'You can call get_crypto_price and get_funding_rate from the Crypto Prices MCP server. '
            'Use calculator for arithmetic (e.g. profit from funding rate × position). '
            'Use data_formatter to present results as a clean table when helpful.'
        ),
    )
