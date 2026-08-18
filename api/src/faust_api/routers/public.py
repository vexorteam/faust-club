"""The two endpoints the showcase is built from (§5.3).

Neither is called from a browser: Next fetches them while building the pages
and while revalidating, so there is no CORS to configure and no session to
check. What they must be is cheap and complete — the menu is the hottest query
in the project, and everything the page needs has to arrive in one answer.

Both filter the hidden rows and sort by `order` here, because the frontend
renders the arrays exactly as they come.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from faust_api.db import get_session
from faust_api.models import AtmospherePhoto, MenuCategory
from faust_api.schemas.public import (
    AtmosphereResponse,
    MenuResponse,
    PublicAtmospherePhoto,
    PublicMenuCategory,
)

router = APIRouter(tags=["public"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/menu", response_model=MenuResponse)
async def read_menu(session: Session) -> MenuResponse:
    """The whole bar card in one query.

    `selectinload` instead of a loop over categories: this endpoint runs on
    every build and every revalidation, and N+1 here is N+1 on the critical
    path of the site.
    """
    categories = await session.scalars(
        select(MenuCategory)
        .where(MenuCategory.visible.is_(True))
        .order_by(MenuCategory.order)
        .options(selectinload(MenuCategory.items))
    )

    return MenuResponse(categories=[PublicMenuCategory.of(category) for category in categories])


@router.get("/atmosphere", response_model=AtmosphereResponse)
async def read_atmosphere(session: Session) -> AtmosphereResponse:
    """Tiles of the home page grid. No photos means no section at all."""
    photos = await session.scalars(
        select(AtmospherePhoto).where(AtmospherePhoto.visible.is_(True)).order_by(AtmospherePhoto.order)
    )

    return AtmosphereResponse(photos=[PublicAtmospherePhoto.of(photo) for photo in photos])
