"""Shared AG-UI state models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DashboardState(BaseModel):
    active_filter: str = Field(default='all')
    selected_metric: str = Field(default='revenue')
    calculation_result: float | None = Field(default=None)
    table_data: list[dict[str, object]] | None = Field(default=None)
