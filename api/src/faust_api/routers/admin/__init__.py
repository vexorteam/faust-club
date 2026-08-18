"""Everything behind the login (§5.3.1).

One router per entity, all of them mounted under `/api/v1/admin` and all of
them asking for `current_admin` — the real check, done again on every request.
The frontend has its own guard, but it is a convenience for the owner: anybody
can talk to this API directly, so nothing here trusts that the check already
happened (§3.5).
"""

from fastapi import APIRouter, Depends

from faust_api.routers.admin import categories, items
from faust_api.security.dependencies import current_admin

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    # On the router rather than on every handler: a check you can forget to
    # write is a check that will eventually be forgotten.
    dependencies=[Depends(current_admin)],
)

router.include_router(categories.router)
router.include_router(items.router)

__all__ = ["router"]
