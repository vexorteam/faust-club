"""Every environment variable the API reads, in one place.

A missing variable is a configuration mistake, not a runtime one: the
application refuses to start and says which names are absent, instead of
answering 500 to the first visitor who happens to open the menu.

Secrets are `SecretStr` on purpose — that way an accidental `print(settings)`
or a logged traceback shows `**********` rather than the JWT key.
"""

from functools import cached_property, lru_cache
from ipaddress import IPv4Network, IPv6Network, ip_network
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "production"]

REQUIRED_HINT = {
    "database_url": "DATABASE_URL — рядок підключення до Postgres",
    "jwt_secret": "JWT_SECRET — секрет підпису токенів, існує тільки тут",
    "media_base_url": "MEDIA_BASE_URL — префікс, з якого складаються URL фото",
    "upload_dir": "UPLOAD_DIR — тека, у якій живуть завантажені фото",
}


class ConfigurationError(RuntimeError):
    """Raised at startup when the environment is not usable.

    Carries a text meant for whoever is deploying the thing: which variables
    are missing and what each of them is for.
    """


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Environment = "development"

    database_url: str
    """Async driver included: postgresql+asyncpg://user:pass@host:5432/faust"""

    jwt_secret: SecretStr
    jwt_ttl_days: int = Field(default=7, ge=1, le=90)

    media_base_url: str
    """No trailing slash: photo URLs are built as {media_base_url}/{key}"""

    upload_dir: Path

    trusted_proxies: str = ""
    """Comma-separated addresses or CIDRs whose `X-Forwarded-For` may be believed.

    Empty by default, which means nobody: the login limit then counts the peer
    that actually opened the connection. Behind the frontend that peer is the
    same for every visitor, so the compose file names the web container's
    network here — and an attacker talking to the API directly still cannot
    forge their way into somebody else's bucket.
    """

    revalidate_url: str | None = None
    """POST target on the frontend; without it the showcase only updates by ISR timer."""

    revalidate_secret: SecretStr | None = None

    seed_admin_email: str | None = None
    seed_admin_password: SecretStr | None = None
    """Only read by the seed script — never by the application itself."""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def media_prefix(self) -> str:
        return self.media_base_url.rstrip("/")

    @cached_property
    def trusted_proxy_networks(self) -> tuple[IPv4Network | IPv6Network, ...]:
        """Parsed once. An unreadable entry is dropped, not fatal: a typo in this
        variable must not keep the whole API from starting."""
        networks: list[IPv4Network | IPv6Network] = []

        for entry in self.trusted_proxies.split(","):
            candidate = entry.strip()

            if not candidate:
                continue

            try:
                networks.append(ip_network(candidate, strict=False))
            except ValueError:
                continue

        return tuple(networks)


def _describe(error: ValidationError) -> str:
    """Turns pydantic's report into a sentence a human can act on."""
    missing = [str(item["loc"][0]) for item in error.errors() if item["type"] == "missing"]
    broken = [
        f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
        for item in error.errors()
        if item["type"] != "missing"
    ]

    lines: list[str] = []

    if missing:
        lines.append("Не налаштовані обов'язкові змінні оточення:")
        lines.extend(f"  - {REQUIRED_HINT.get(name, name.upper())}" for name in missing)

    if broken:
        lines.append("Некоректні значення:")
        lines.extend(f"  - {item}" for item in broken)

    lines.append("Скопіюйте api/.env.example у api/.env і заповніть.")

    return "\n".join(lines)


@lru_cache
def get_settings() -> Settings:
    """The only way to read configuration. Cached: env does not change at runtime."""
    try:
        # Every value comes from the environment, so the call takes no arguments.
        return Settings()
    except ValidationError as error:
        raise ConfigurationError(_describe(error)) from error
