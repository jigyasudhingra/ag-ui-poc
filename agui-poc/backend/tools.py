"""Backend tools: Tavily helper + stdlib-only custom tools."""

from __future__ import annotations

import ast
import csv
import io
import json
import operator
import random
import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

_ALLOWED_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
}


class CalcResult(BaseModel):
    expression: str
    result: float
    steps: list[str] = Field(default_factory=list)


class ConversionResult(BaseModel):
    from_value: float
    to_value: float
    category: str


class TableData(BaseModel):
    headers: list[str]
    rows: list[list[Any]]
    title: str = ''


def _safe_eval_number(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -_safe_eval_number(node.operand)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd):
        return _safe_eval_number(node.operand)
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _ALLOWED_BIN_OPS:
            raise ValueError(f'Unsupported operator: {op_type}')
        left = _safe_eval_number(node.left)
        right = _safe_eval_number(node.right)
        if isinstance(node.op, ast.Div) and right == 0:
            raise ValueError('Division by zero')
        return float(_ALLOWED_BIN_OPS[op_type](left, right))
    raise ValueError(
        'expression must be numeric arithmetic only (no names, calls, or comparisons)'
    )


def calculator(expression: str) -> CalcResult:
    """Evaluate a safe arithmetic expression (+ - * / ** %). Supports parentheses."""
    expr = expression.strip()
    try:
        tree = ast.parse(expr, mode='eval')
        result = _safe_eval_number(tree.body)
        return CalcResult(expression=expr, result=result, steps=[f'{expr} = {result}'])
    except SyntaxError as e:
        hint = (e.msg or str(e)).strip()
        return CalcResult(
            expression=expr,
            result=0.0,
            steps=[
                'Invalid syntax — calculator needs arithmetic only (numbers, + - * / ** %, parentheses). '
                f'Do not pass prose. Examples: 132500 * 0.10, (120000 + 15000) / 2. Parser note: {hint}.',
            ],
        )
    except ZeroDivisionError:
        return CalcResult(
            expression=expr,
            result=0.0,
            steps=['Division by zero — rewrite the expression with a non-zero divisor.'],
        )
    except ValueError as e:
        return CalcResult(
            expression=expr,
            result=0.0,
            steps=[
                f'Invalid expression {expr!r}: {e}. '
                'Use decimals for percentages (10% → multiply by 0.10). No variable names or words.',
            ],
        )
    except Exception as e:
        return CalcResult(
            expression=expr,
            result=0.0,
            steps=[f'Calculator failed ({type(e).__name__}): {e}'],
        )


def unit_converter(value: float, from_unit: str, to_unit: str) -> ConversionResult:
    """Convert length (km/miles/m/ft), weight (kg/lbs), or temperature (C/F)."""
    fu = from_unit.lower().strip()
    tu = to_unit.lower().strip()

    if fu in {'km'} and tu in {'miles', 'mi'}:
        return ConversionResult(from_value=value, to_value=value * 0.621371, category='length')
    if fu in {'miles', 'mi'} and tu in {'km'}:
        return ConversionResult(from_value=value, to_value=value / 0.621371, category='length')
    if fu in {'m'} and tu in {'ft', 'feet'}:
        return ConversionResult(from_value=value, to_value=value * 3.28084, category='length')
    if fu in {'ft', 'feet'} and tu in {'m'}:
        return ConversionResult(from_value=value, to_value=value / 3.28084, category='length')

    if fu in {'kg'} and tu in {'lbs', 'lb'}:
        return ConversionResult(from_value=value, to_value=value * 2.20462, category='weight')
    if fu in {'lbs', 'lb'} and tu in {'kg'}:
        return ConversionResult(from_value=value, to_value=value / 2.20462, category='weight')

    if fu in {'c', 'celsius'} and tu in {'f', 'fahrenheit'}:
        return ConversionResult(from_value=value, to_value=value * 9 / 5 + 32, category='temperature')
    if fu in {'f', 'fahrenheit'} and tu in {'c', 'celsius'}:
        return ConversionResult(from_value=value, to_value=(value - 32) * 5 / 9, category='temperature')

    raise ValueError(
        'Unsupported conversion; use length (km/miles/m/ft), weight (kg/lbs), or temperature (C/F).'
    )


def datetime_tool(mode: str, date_iso: str | None = None) -> str:
    """UTC helpers: now | weekday | days_until | days_since (date_iso ISO format)."""
    now = datetime.now(UTC)
    m = mode.lower().strip()
    if m == 'now':
        return now.isoformat()
    if m == 'weekday':
        return now.strftime('%A')
    if m in {'days_until', 'days_since'}:
        if not date_iso:
            raise ValueError('date_iso required')
        target = datetime.fromisoformat(date_iso.replace('Z', '+00:00'))
        if target.tzinfo is None:
            target = target.replace(tzinfo=UTC)
        delta = (target.date() - now.date()).days
        return str(delta if m == 'days_until' else -delta)
    raise ValueError('mode must be now|weekday|days_until|days_since')


def data_formatter(raw_data: str, title: str = 'Table') -> TableData:
    """Parse a JSON array of objects or CSV text into a structured table."""
    raw = raw_data.strip()
    if raw.startswith('['):
        data = json.loads(raw)
        if not data:
            return TableData(headers=[], rows=[], title=title)
        if isinstance(data[0], dict):
            headers = list(data[0].keys())
            rows = [[row.get(h, '') for h in headers] for row in data]
            return TableData(headers=headers, rows=rows, title=title)
        raise ValueError('JSON array must contain objects')
    reader = csv.reader(io.StringIO(raw))
    rows_list = list(reader)
    if not rows_list:
        return TableData(headers=[], rows=[], title=title)
    headers = [str(c).strip() for c in rows_list[0]]
    rows = [[str(c).strip() for c in r] for r in rows_list[1:]]
    return TableData(headers=headers, rows=rows, title=title)


def random_generator(
    mode: str,
    *,
    min_value: int = 1,
    max_value: int = 100,
    choices: list[str] | None = None,
    count: int = 1,
    dice_sides: int = 6,
    dice_count: int = 1,
) -> str:
    """number: random ints; uuid: UUIDs; pick: choose from choices; dice: roll dice."""
    mode_l = mode.lower().strip()
    n = max(1, count)
    if mode_l == 'number':
        return ', '.join(str(random.randint(min_value, max_value)) for _ in range(n))
    if mode_l == 'uuid':
        return '\n'.join(str(uuid.uuid4()) for _ in range(n))
    if mode_l == 'pick':
        if not choices:
            raise ValueError('choices required')
        return random.choice(choices)
    if mode_l == 'dice':
        rolls = [random.randint(1, dice_sides) for _ in range(max(1, dice_count))]
        return f'{rolls} (sum={sum(rolls)})'
    raise ValueError('mode must be number|uuid|pick|dice')


def build_tavily_tool(api_key: str | None):
    """Return Tavily search tool or None if no API key."""
    if not api_key:
        return None
    from pydantic_ai.common_tools.tavily import tavily_search_tool

    return tavily_search_tool(api_key=api_key)
