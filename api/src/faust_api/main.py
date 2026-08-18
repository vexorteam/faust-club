"""Application factory.

Routers arrive step by step: the public menu and atmosphere in Б3, auth in Б4,
the admin CRUD in Б5, photos and their serving in Б6. What exists from the first step is the part everything
else relies on — configuration that refuses to start when it is wrong, and one
single shape for failures.
"""

import logging

from fastapi import FastAPI

from faust_api import __version__
from faust_api.handlers import install_handlers
from faust_api.routers import auth, health, media, public
from faust_api.routers.admin import router as admin_router
from faust_api.settings import ConfigurationError, Settings, get_settings

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"


def configure_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    logger.info("[api] starting in %s mode, version %s", settings.environment, __version__)


def create_app() -> FastAPI:
    try:
        settings = get_settings()
    except ConfigurationError as error:
        # Refusing to start beats answering 500 to the first visitor.
        logging.basicConfig(level=logging.ERROR)
        logger.error("[api] не можу запуститись:\n%s", error)
        raise

    configure_logging(settings)

    app = FastAPI(
        title="Faust API",
        version=__version__,
        # An internal API has no reason to publish its own schema in production.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    install_handlers(app)
    # /health is for ops and stays outside the versioned prefix; everything the
    # frontend talks to lives under /api/v1.
    app.include_router(health.router)
    # Photos are addressed by MEDIA_BASE_URL, which points at /media directly —
    # they are not part of the versioned contract.
    app.include_router(media.router)
    app.include_router(public.router, prefix=API_PREFIX)
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(admin_router, prefix=API_PREFIX)

    return app


app = create_app()
