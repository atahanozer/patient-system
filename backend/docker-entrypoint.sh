#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Seeding database (idempotent)..."
npx prisma db seed

echo "[entrypoint] Starting NestJS application..."
exec node dist/src/main
