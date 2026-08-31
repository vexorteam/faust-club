import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import InternalError, NotFoundError, ValidationError
from faust_api.models import OperatingHours, SiteSettings, SocialLink
from faust_api.schemas.admin import (
    Acknowledged,
    AdminOperatingHours,
    AdminSiteSettings,
    AdminSocialLink,
    HoursPatch,
    MoveRequest,
    OperatingHoursDayResponse,
    OperatingHoursResponse,
    SiteSettingsPatch,
    SiteSettingsResponse,
    SocialCreate,
    SocialLinkResponse,
    SocialLinksResponse,
    SocialPatch,
    changes_of,
)
from faust_api.services.ordering import append, close_gap, move
from faust_api.services.revalidate import request_revalidation

router = APIRouter(prefix="/settings")

Session = Annotated[AsyncSession, Depends(get_session)]

MISSING_SETTINGS_MESSAGE = "Налаштування сайту ще не заповнені. Запустіть seed"
MISSING_SOCIAL_MESSAGE = "Соціальну мережу не знайдено. Можливо, її щойно видалили"
MISSING_DAY_MESSAGE = "Немає такого дня тижня"
HOURS_MISMATCH_MESSAGE = "Час відкриття й закриття вказуються разом, або жодного — вихідний день"

DAY_MIN = 1
DAY_MAX = 7


async def load_settings(session: AsyncSession) -> SiteSettings:
    settings = await session.scalar(select(SiteSettings).limit(1))

    if settings is None:
        raise InternalError(MISSING_SETTINGS_MESSAGE)

    return settings


async def load_social(session: AsyncSession, social_id: uuid.UUID) -> SocialLink:
    social = await session.get(SocialLink, social_id)

    if social is None:
        raise NotFoundError(MISSING_SOCIAL_MESSAGE)

    return social


async def load_day(session: AsyncSession, day: int) -> OperatingHours:
    if not (DAY_MIN <= day <= DAY_MAX):
        raise NotFoundError(MISSING_DAY_MESSAGE)

    hours = await session.scalar(select(OperatingHours).where(OperatingHours.day == day))

    if hours is None:
        raise InternalError(MISSING_SETTINGS_MESSAGE)

    return hours


@router.get("", response_model=SiteSettingsResponse)
async def read_settings(session: Session) -> SiteSettingsResponse:
    return SiteSettingsResponse(settings=AdminSiteSettings.of(await load_settings(session)))


@router.patch("", response_model=SiteSettingsResponse)
async def update_settings(
    payload: SiteSettingsPatch, session: Session, revalidation: BackgroundTasks
) -> SiteSettingsResponse:
    changes = changes_of(payload)
    settings = await load_settings(session)

    for name, value in changes.items():
        setattr(settings, name, value)

    await session.commit()
    revalidation.add_task(request_revalidation, "settings")

    return SiteSettingsResponse(settings=AdminSiteSettings.of(settings))


@router.get("/hours", response_model=OperatingHoursResponse)
async def read_hours(session: Session) -> OperatingHoursResponse:
    rows = await session.scalars(select(OperatingHours).order_by(OperatingHours.day))

    return OperatingHoursResponse(hours=[AdminOperatingHours.of(row) for row in rows])


@router.patch("/hours/{day}", response_model=OperatingHoursDayResponse)
async def update_hours(
    day: int, payload: HoursPatch, session: Session, revalidation: BackgroundTasks
) -> OperatingHoursDayResponse:
    """A day is open with both times set, or closed with neither — never one alone."""
    changes = changes_of(payload)
    hours = await load_day(session, day)

    open_value = changes.get("open", hours.open)
    close_value = changes.get("close", hours.close)

    if (open_value is None) != (close_value is None):
        raise ValidationError(HOURS_MISMATCH_MESSAGE, fields={"open": HOURS_MISMATCH_MESSAGE})

    for name, value in changes.items():
        setattr(hours, name, value)

    await session.commit()
    revalidation.add_task(request_revalidation, "settings")

    return OperatingHoursDayResponse(hours=AdminOperatingHours.of(hours))


@router.get("/socials", response_model=SocialLinksResponse)
async def read_socials(session: Session) -> SocialLinksResponse:
    rows = await session.scalars(select(SocialLink).order_by(SocialLink.order))

    return SocialLinksResponse(socials=[AdminSocialLink.of(row) for row in rows])


@router.post("/socials", response_model=SocialLinkResponse)
async def create_social(
    payload: SocialCreate, session: Session, revalidation: BackgroundTasks
) -> SocialLinkResponse:
    social = SocialLink(
        name=payload.name,
        href=payload.href,
        handle=payload.handle,
        order=await append(session, SocialLink),
    )

    session.add(social)
    await session.commit()
    revalidation.add_task(request_revalidation, "settings")

    return SocialLinkResponse(social=AdminSocialLink.of(social))


@router.patch("/socials/{social_id}", response_model=SocialLinkResponse)
async def update_social(
    social_id: uuid.UUID, payload: SocialPatch, session: Session, revalidation: BackgroundTasks
) -> SocialLinkResponse:
    changes = changes_of(payload)
    social = await load_social(session, social_id)

    for name, value in changes.items():
        setattr(social, name, value)

    await session.commit()
    revalidation.add_task(request_revalidation, "settings")

    return SocialLinkResponse(social=AdminSocialLink.of(social))


@router.delete("/socials/{social_id}", response_model=Acknowledged)
async def delete_social(
    social_id: uuid.UUID, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    social = await load_social(session, social_id)

    await session.delete(social)
    await close_gap(session, SocialLink, social.order)
    await session.commit()

    revalidation.add_task(request_revalidation, "settings")

    return Acknowledged()


@router.post("/socials/{social_id}/move", response_model=Acknowledged)
async def move_social(
    social_id: uuid.UUID, payload: MoveRequest, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    social = await load_social(session, social_id)

    if await move(session, social, payload.direction):
        await session.commit()
        revalidation.add_task(request_revalidation, "settings")

    return Acknowledged()