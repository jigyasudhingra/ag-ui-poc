"""Stdio MCP server: crypto price demo tools (UC8)."""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

mcp = FastMCP('Crypto Prices')


@mcp.tool()
def get_crypto_price(symbol: str) -> dict:
    """Get the current price of a cryptocurrency by symbol (e.g. BTC, ETH)."""
    prices = {'BTC': 95400.0, 'ETH': 3210.0, 'SOL': 165.0}
    sym = symbol.upper()
    return {
        'symbol': sym,
        'price_usd': prices.get(sym, 0),
        'source': 'mock-exchange',
    }


@mcp.tool()
def get_funding_rate(symbol: str) -> dict:
    """Get perpetual futures funding rate for a symbol."""
    rates = {'BTC': 0.0012, 'ETH': 0.0008}
    sym = symbol.upper()
    return {'symbol': sym, 'rate': rates.get(sym, 0), 'period': '8h'}


def main() -> None:
    mcp.run(transport='stdio')


if __name__ == '__main__':
    main()
