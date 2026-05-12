"""FastAPI entrypoint: one AG-UI POST route per demo."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request

from pydantic_ai.ui import StateDeps
from pydantic_ai.ui.ag_ui import AGUIAdapter

from agents import (
    context_agent,
    genui,
    hitl,
    mcp_demo,
    multi_step,
    shared_state,
    streaming,
)
from state_models import DashboardState

load_dotenv()

MODEL = os.getenv('OPENAI_MODEL', 'openai:gpt-4o')
TAVILY_KEY = os.getenv('TAVILY_API_KEY')

_agents: dict[str, object] | None = None


def _load_agents() -> None:
    global _agents
    if not os.getenv('OPENAI_API_KEY'):
        _agents = None
        return
    _agents = {
        'streaming': streaming.build(MODEL, tavily_key=TAVILY_KEY),
        'genui': genui.build(MODEL),
        'hitl': hitl.build(MODEL),
        'frontend_tools': streaming.build(MODEL, tavily_key=None),
        'shared_state': shared_state.build(MODEL),
        'context': context_agent.build(MODEL, tavily_key=TAVILY_KEY),
        'multi_step': multi_step.build(MODEL, tavily_key=TAVILY_KEY),
        'mcp_demo': mcp_demo.build(MODEL),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_agents()
    mcp_agent = _agents.get('mcp_demo') if _agents else None
    if mcp_agent is not None:
        async with mcp_agent:
            yield
    else:
        yield


app = FastAPI(title='AG-UI POC Backend', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)


async def _dispatch(agent_key: str, request: Request, *, deps=None):
    if _agents is None:
        return JSONResponse(
            {'detail': 'Set OPENAI_API_KEY in backend/.env (see .env.example).'},
            status_code=503,
        )
    return await AGUIAdapter.dispatch_request(request, agent=_agents[agent_key], deps=deps)


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'agents_loaded': str(bool(_agents))}


@app.post('/api/streaming-chat')
async def streaming_chat(request: Request):
    return await _dispatch('streaming', request)


@app.post('/api/genui')
async def genui_route(request: Request):
    return await _dispatch('genui', request)


@app.post('/api/hitl')
async def hitl_route(request: Request):
    return await _dispatch('hitl', request)


@app.post('/api/frontend-tools')
async def frontend_tools_route(request: Request):
    return await _dispatch('frontend_tools', request)


@app.post('/api/shared-state')
async def shared_state_route(request: Request):
    return await _dispatch(
        'shared_state',
        request,
        deps=StateDeps(DashboardState()),
    )


@app.post('/api/context')
async def context_route(request: Request):
    return await _dispatch('context', request)


@app.post('/api/multi-step')
async def multi_step_route(request: Request):
    return await _dispatch('multi_step', request)


@app.post('/api/mcp-demo')
async def mcp_demo_route(request: Request):
    return await _dispatch('mcp_demo', request)
