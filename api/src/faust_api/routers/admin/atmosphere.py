"""Tiles of the "Атмосфера" grid (§5.3.1).

The one thing that makes this router different from the other two: a tile *is*
its picture. It cannot be created without a file, and there is no way to take
the photo off and keep the tile — removing the shot means removing the tile
(§13.4). That is why `POST /admin/atmosphere` is multipart while every other
create in this API is JSON, and why there is no `DELETE .../image` here.

The caption and the description are two different texts and both are required:
`label` is what a visitor reads on the tile, `imageAlt` is what a screen reader
says instead of the picture.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import NotFoundError
from faust_api.models import AtmospherePhoto
from faust_api.schemas.admin import (
    Acknowledged,
    AdminAtmospherePhoto,
    AtmospherePatch,
    AtmospherePhotoResponse,
    AtmospherePhotosResponse,
    MoveRequest,
    RequiredImageAlt,
    TileLabel,
    changes_of,
)
from faust_api.services.images import ATMOSPHERE_FOLDER, accept_upload, remove_photo, stored_photo
from faust_api.services.ordering import append, close_gap, move
from faust_api.services.revalidate import request_revalidation

router = APIRouter(prefix="/atmosphere")

Session = Annotated[AsyncSession, Depends(get_session)]

Upload = Annotated[UploadFile | None, File()]
Alt = Annotated[RequiredImageAlt, Form()]

MISSING_MESSAGE = "Фото не знайдено. Можливо, його щойно видалили"


async def load_photo(session: AsyncSession, photo_id: uuid.UUID) -> AtmospherePhoto:
    photo = await session.get(AtmospherePhoto, photo_id)

    if photo is None:
        raise NotFoundError(MISSING_MESSAGE)

    return photo


@router.get("", response_model=AtmospherePhotosResponse)
async def read_photos(session: Session) -> AtmospherePhotosResponse:
    """All tiles, hidden included, in the order the grid shows them.

    There is no single-tile endpoint on purpose: the list is a handful of rows,
    and the edit form reads it and picks rather than asking for a second one.
    """
    photos = await session.scalars(select(AtmospherePhoto).order_by(AtmospherePhoto.order))

    return AtmospherePhotosResponse(photos=[AdminAtmospherePhoto.of(photo) for photo in photos])


@router.post("", response_model=AtmospherePhotoResponse)
async def create_photo(
    session: Session,
    revalidation: BackgroundTasks,
    label: Annotated[TileLabel, Form()],
    alt: Alt,
    file: Upload = None,
) -> AtmospherePhotoResponse:
    """Caption, description and picture in one request — a tile has no other shape.

    The identifier is minted here rather than by the database, because the
    photo is stored under it: the files have to know whose they are before the
    row exists.
    """
    data = await accept_upload(file)
    photo_id = uuid.uuid4()

    async with stored_photo(ATMOSPHERE_FOLDER, photo_id, data) as image_key:
        photo = AtmospherePhoto(
            id=photo_id,
            label=label,
            image_alt=alt,
            image_key=image_key,
            order=await append(session, AtmospherePhoto),
        )

        session.add(photo)
        await session.commit()

    revalidation.add_task(request_revalidation, "atmosphere")

    return AtmospherePhotoResponse(photo=AdminAtmospherePhoto.of(photo))


@router.patch("/{photo_id}", response_model=AtmospherePhotoResponse)
async def update_photo(
    photo_id: uuid.UUID, payload: AtmospherePatch, session: Session, revalidation: BackgroundTasks
) -> AtmospherePhotoResponse:
    """Fixing a caption must not require uploading the photo again."""
    changes = changes_of(payload)
    photo = await load_photo(session, photo_id)

    # No renames on this entity: the columns already carry the contract's names.
    for name, value in changes.items():
        setattr(photo, name, value)

    await session.commit()

    revalidation.add_task(request_revalidation, "atmosphere")

    return AtmospherePhotoResponse(photo=AdminAtmospherePhoto.of(photo))


@router.post("/{photo_id}/image", response_model=AtmospherePhotoResponse)
async def replace_image(
    photo_id: uuid.UUID,
    session: Session,
    revalidation: BackgroundTasks,
    alt: Alt,
    file: Upload = None,
) -> AtmospherePhotoResponse:
    """Swaps the picture of an existing tile and takes the old files with it.

    The new files are written before the row is touched, so an upload that
    fails leaves the tile exactly as it was. The old ones go afterwards: by
    then nothing points at them any more.
    """
    photo = await load_photo(session, photo_id)
    data = await accept_upload(file)

    previous = photo.image_key

    async with stored_photo(ATMOSPHERE_FOLDER, photo.id, data) as image_key:
        photo.image_key = image_key
        photo.image_alt = alt

        await session.commit()

    if previous != photo.image_key:
        await remove_photo(previous)

    revalidation.add_task(request_revalidation, "atmosphere")

    return AtmospherePhotoResponse(photo=AdminAtmospherePhoto.of(photo))


@router.delete("/{photo_id}", response_model=Acknowledged)
async def delete_photo(photo_id: uuid.UUID, session: Session, revalidation: BackgroundTasks) -> Acknowledged:
    """Removes the tile together with its files and closes the gap in the grid."""
    photo = await load_photo(session, photo_id)
    image_key, vacated = photo.image_key, photo.order

    await session.delete(photo)
    await close_gap(session, AtmospherePhoto, vacated)
    await session.commit()

    await remove_photo(image_key)

    revalidation.add_task(request_revalidation, "atmosphere")

    return Acknowledged()


@router.post("/{photo_id}/move", response_model=Acknowledged)
async def move_photo(
    photo_id: uuid.UUID, payload: MoveRequest, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    photo = await load_photo(session, photo_id)

    if await move(session, photo, payload.direction):
        await session.commit()
        revalidation.add_task(request_revalidation, "atmosphere")

    return Acknowledged()
