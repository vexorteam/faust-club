from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from faust_api.db import get_session
from faust_api.errors import InternalError
from faust_api.models import (
    AtmospherePhoto,
    MenuCategory,
    OperatingHours,
    SiteSettings,
    SocialLink,
    Testimonial,
)
from faust_api.schemas.public import (
    AtmosphereResponse,
    MenuResponse,
    PublicAtmospherePhoto,
    PublicMenuCategory,
    PublicTestimonial,
    SettingsResponse,
    TestimonialsResponse,
)

router = APIRouter(tags=["public"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/menu", response_model=MenuResponse)
async def read_menu(session: Session) -> MenuResponse:
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


@router.get("/settings", response_model=SettingsResponse)
async def read_settings(session: Session) -> SettingsResponse:
    settings = await session.scalar(select(SiteSettings).limit(1))

    if settings is None:
        raise InternalError("Налаштування сайту ще не заповнені. Запустіть seed")

    socials = await session.scalars(select(SocialLink).order_by(SocialLink.order))
    hours = await session.scalars(select(OperatingHours).order_by(OperatingHours.day))

    return SettingsResponse.of(settings, list(socials), list(hours))


@router.get("/testimonials", response_model=TestimonialsResponse)
async def read_testimonials(session: Session) -> TestimonialsResponse:
    """Visible review cards for the home page grid. No rows means no section at all."""
    rows = await session.scalars(
        select(Testimonial).where(Testimonial.visible.is_(True)).order_by(Testimonial.order)
    )

    return TestimonialsResponse(testimonials=[PublicTestimonial.of(row) for row in rows])