# syntax=docker/dockerfile:1

# Two stages: the first resolves the dependencies, the second runs them. What
# ends up on the server is a plain Python image plus a virtualenv — no uv, no
# compilers, no lock file, nothing that only mattered while building.

FROM python:3.13-slim AS builder

# uv comes from its own published image and is pinned: a build that resolves
# packages differently next month is a build that ships something else.
COPY --from=ghcr.io/astral-sh/uv:0.12.5 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Dependencies before sources: editing a router must not re-resolve the whole
# dependency tree.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


FROM python:3.13-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# Non-root (§3.5). The uid is fixed so that a volume created by this image
# keeps working after a rebuild, and so a bind mount can be given to it.
RUN groupadd --gid 1001 faust \
 && useradd --uid 1001 --gid 1001 --no-create-home --shell /usr/sbin/nologin faust

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY src ./src
# The migrations ship with the image on purpose: the `migrate` service in
# docker-compose.yml runs `alembic upgrade head` from this very image, so the
# schema and the code that expects it can never travel separately.
COPY alembic.ini ./
COPY migrations ./migrations

# Docker seeds a new named volume from the image directory, ownership included
# — without this line the volume would arrive owned by root and the API could
# not write a single photo into it.
RUN mkdir -p /app/uploads && chown faust:faust /app/uploads

USER faust

EXPOSE 8000

# Worker count comes from the environment (§13.2). It defaults to one, and
# raising it has a consequence worth knowing: the login limit counts attempts
# in the memory of a process, so N workers mean N buckets and up to 5×N
# guesses per ten minutes. Raise it when traffic asks for it, and move the
# limiter out of process memory first if the login page is what worries you.
CMD ["sh", "-c", "exec uvicorn faust_api.main:app --host 0.0.0.0 --port 8000 --workers ${API_WORKERS:-1}"]
