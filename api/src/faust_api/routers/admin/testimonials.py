import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import NotFoundError
from faust_api.models import Testimonial
from faust_api.schemas.admin import (
    Acknowledged,
    AdminTestimonial,
    MoveRequest,
    TestimonialCreate,
    TestimonialPatch,
    TestimonialResponse,
    TestimonialsResponse,
    changes_of,
)
from faust_api.services.ordering import append, close_gap, move
from faust_api.services.revalidate import request_revalidation

router = APIRouter(prefix="/testimonials")

Session = Annotated[AsyncSession, Depends(get_session)]

MISSING_MESSAGE = "Відгук не знайдено. Можливо, його щойно видалили"


async def load_testimonial(session: AsyncSession, testimonial_id: uuid.UUID) -> Testimonial:
    testimonial = await session.get(Testimonial, testimonial_id)

    if testimonial is None:
        raise NotFoundError(MISSING_MESSAGE)

    return testimonial


@router.get("", response_model=TestimonialsResponse)
async def read_testimonials(session: Session) -> TestimonialsResponse:
    """All cards, hidden included, in the order the grid shows them."""
    rows = await session.scalars(select(Testimonial).order_by(Testimonial.order))

    return TestimonialsResponse(testimonials=[AdminTestimonial.of(row) for row in rows])


@router.post("", response_model=TestimonialResponse)
async def create_testimonial(
    payload: TestimonialCreate, session: Session, revalidation: BackgroundTasks
) -> TestimonialResponse:
    testimonial = Testimonial(
        text=payload.text,
        name=payload.name,
        meta=payload.meta,
        visible=payload.visible,
        order=await append(session, Testimonial),
    )

    session.add(testimonial)
    await session.commit()

    revalidation.add_task(request_revalidation, "testimonials")

    return TestimonialResponse(testimonial=AdminTestimonial.of(testimonial))


@router.patch("/{testimonial_id}", response_model=TestimonialResponse)
async def update_testimonial(
    testimonial_id: uuid.UUID, payload: TestimonialPatch, session: Session, revalidation: BackgroundTasks
) -> TestimonialResponse:
    changes = changes_of(payload)
    testimonial = await load_testimonial(session, testimonial_id)

    for name, value in changes.items():
        setattr(testimonial, name, value)

    await session.commit()

    revalidation.add_task(request_revalidation, "testimonials")

    return TestimonialResponse(testimonial=AdminTestimonial.of(testimonial))


@router.delete("/{testimonial_id}", response_model=Acknowledged)
async def delete_testimonial(
    testimonial_id: uuid.UUID, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    testimonial = await load_testimonial(session, testimonial_id)
    vacated = testimonial.order

    await session.delete(testimonial)
    await close_gap(session, Testimonial, vacated)
    await session.commit()

    revalidation.add_task(request_revalidation, "testimonials")

    return Acknowledged()


@router.post("/{testimonial_id}/move", response_model=Acknowledged)
async def move_testimonial(
    testimonial_id: uuid.UUID, payload: MoveRequest, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    testimonial = await load_testimonial(session, testimonial_id)

    if await move(session, testimonial, payload.direction):
        await session.commit()
        revalidation.add_task(request_revalidation, "testimonials")

    return Acknowledged()