"""Serving the stored photos.

The volume is the storage, and the API is what hands its files out — there is
no separate nginx for media in version 1.0 (§13.4). The address a browser sees
is built from `MEDIA_BASE_URL`, so in production this router answers on
`media.faust.bar` and locally on `localhost:8000/media`.

Everything here is immutable: a file name carries the hash of its content, so a
changed photo is a new name and a cached one is never stale.
"""

from typing import Annotated

from fastapi import APIRouter, Path
from fastapi.responses import FileResponse

from faust_api.services.images import CACHE_CONTROL, EXTENSION, resolve_media

router = APIRouter(tags=["media"])

MEDIA_TYPE = f"image/{EXTENSION}"


# HEAD as well as GET: a CDN or a browser revalidating a cached photo asks for
# the headers alone, and this route is the closest thing the project has to a
# static file server.
@router.api_route("/media/{name:path}", methods=["GET", "HEAD"])
async def read_photo(name: Annotated[str, Path()]) -> FileResponse:
    """One photo variant, or a 404 in the usual envelope.

    `resolve_media` checks the name against the shape the server itself
    generates before it becomes a path: a request names a photo, it does not
    describe a location on disk.
    """
    return FileResponse(
        resolve_media(name),
        media_type=MEDIA_TYPE,
        headers={"cache-control": CACHE_CONTROL},
    )
