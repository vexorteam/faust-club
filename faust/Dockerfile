# syntax=docker/dockerfile:1

# Three stages. Only the last one ships: Next builds a standalone server that
# carries the pieces of node_modules it actually uses, so the runtime image has
# no package manager, no sources and no dependency tree.

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Everything Next bakes in at build time. `MEDIA_HOSTNAME` ends up in the image
# allow-list, so a photo host is decided here and not by an environment
# variable on the server (next.config.ts explains why).
ARG MEDIA_HOSTNAME
ARG NEXT_PUBLIC_SITE_URL
ARG LOCAL_MEDIA
# Optional: with the API reachable during the build, `/` and `/menu` come out
# already filled. Without it they are built empty and fill themselves in on the
# first revalidation — which is what happens on a first `docker compose up`,
# where the API starts after this image is built.
ARG MENU_API_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root, like the API.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
