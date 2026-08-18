"""Liveness of the API. Not part of the §5.3 contract — this one is for ops.

It answers 503 while the database is unreachable, because that is exactly what
a container healthcheck has to notice. The frontend never calls it: the public
pages are static and survive a restart of this service.
"""

from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from faust_api import __version__
from faust_api.db import database_ready

router = APIRouter(tags=["ops"])


@router.get("/health")
async def health() -> JSONResponse:
    ready = await database_ready()
    payload: dict[str, Any] = {"status": "ok" if ready else "down", "version": __version__}

    return JSONResponse(payload, status_code=200 if ready else 503)
