"""Bodies and answers of `/auth/*` (§5.4).

One deliberate exception to the camelCase of `ApiModel`: the login answer is
snake_case on the wire — `access_token`, `expires_in`. That is what the
frontend's `loginResponseSchema` reads before renaming it, and the contract is
not worth rewriting on both sides for the sake of tidiness.
"""

import uuid

from pydantic import BaseModel, Field, field_validator

from faust_api.models import AdminUser
from faust_api.schemas.base import ApiModel

EMAIL_LENGTH = 120
# bcrypt stops reading at 72 bytes; a longer password is refused, not truncated.
PASSWORD_MAX = 200


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=EMAIL_LENGTH)
    password: str = Field(min_length=1, max_length=PASSWORD_MAX)

    @field_validator("email")
    @classmethod
    def normalize(cls, value: str) -> str:
        """The address is stored lowercase, so it is compared lowercase."""
        return value.strip().lower()


class AdminUserPayload(ApiModel):
    """Everything the frontend is told about who is signed in. No roles yet."""

    id: uuid.UUID
    name: str
    email: str

    @classmethod
    def of(cls, admin: AdminUser) -> "AdminUserPayload":
        return cls(id=admin.id, name=admin.name, email=admin.email)


class LoginResponse(BaseModel):
    access_token: str
    expires_in: int
    """Seconds of life. Becomes the cookie's Max-Age, so the cookie cannot
    outlive the token it carries."""

    user: AdminUserPayload


class MeResponse(ApiModel):
    """The only proof the frontend has that a session is still alive."""

    user: AdminUserPayload


class LogoutResponse(ApiModel):
    ok: bool = True
