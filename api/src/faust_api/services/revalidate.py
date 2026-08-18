"""Telling the frontend that its cached showcase is out of date.

`POST {REVALIDATE_URL}?tag=menu` with the shared bearer secret (§5.3). The two
tags are separate on purpose: editing an atmosphere tile must not throw away
the cached menu, and the other way round.

Fire-and-forget by design. A frontend that is redeploying, unreachable or
simply misconfigured must never turn a saved price into an error for the owner
— the write already happened. All that a failed call costs is a line in the log
and a showcase that catches up on the ISR timer instead of in seconds.
"""

import logging
from typing import Literal

import httpx

from faust_api.settings import get_settings

logger = logging.getLogger(__name__)

RevalidateTag = Literal["menu", "atmosphere"]

TIMEOUT_SECONDS = 5.0


async def request_revalidation(tag: RevalidateTag) -> bool:
    """Knocks on the frontend. Returns whether it answered; never raises."""
    settings = get_settings()

    if settings.revalidate_url is None or settings.revalidate_secret is None:
        logger.warning(
            "[revalidate] REVALIDATE_URL або REVALIDATE_SECRET не налаштовані — "
            "вітрина оновиться лише за таймером ISR (тег %s)",
            tag,
        )
        return False

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                settings.revalidate_url,
                params={"tag": tag},
                headers={"authorization": f"Bearer {settings.revalidate_secret.get_secret_value()}"},
            )
    except httpx.HTTPError as error:
        logger.warning("[revalidate] фронтенд не відповів на тег %s: %s", tag, error)
        return False

    if response.status_code >= 400:
        logger.warning("[revalidate] фронтенд відповів %s на тег %s", response.status_code, tag)
        return False

    logger.info("[revalidate] вітрину оновлено за тегом %s", tag)

    return True
