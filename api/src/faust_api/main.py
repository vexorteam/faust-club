"""Application factory.

Routers arrive step by step: public menu and atmosphere in Б3, auth in Б4, the
admin CRUD in Б5–Б6. What exists from the first step is the part everything
else relies on — configuration that refuses to start when it is wrong, and one
single shape for failures.
"""

import logging

from fastapi import FastAPI

from faust_api import __version__
from faust_api.handlers import install_handlers
from faust_api.routers import health
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
    app.include_router(health.router)

    return app


app = create_app()
