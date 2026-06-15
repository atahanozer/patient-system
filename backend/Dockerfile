# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# Debian-slim (glibc) so bcrypt's native binding and Prisma's query engine
# build/run without Alpine musl pain. openssl is needed by Prisma.
FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install all deps (incl. dev) — needed for `nest build`, prisma generate, ts-node seed.
COPY package.json package-lock.json ./
RUN npm ci

# Generate the Prisma client (engine matched to this glibc/openssl runtime).
COPY prisma ./prisma
RUN npx prisma generate

# Compile NestJS → dist/
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
# DEMO: this image is optimized for "works in one `docker compose up`", not for
# minimal size. The entrypoint runs `prisma migrate deploy && prisma db seed`,
# and the seed is `ts-node prisma/seed.ts` — so the runtime stage intentionally
# ships ts-node + typescript + @faker-js/faker + the prisma CLI (all dev deps).
# We reuse the build stage's node_modules wholesale rather than prune them.
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# openssl: Prisma query engine needs it at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Everything required to migrate + seed + run.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json package-lock.json tsconfig.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
