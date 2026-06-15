# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# NEXT_PUBLIC_API_URL is inlined into the client bundle at BUILD time, so it
# must be the BROWSER-reachable URL (host-published backend), NOT the docker
# service name. Passed in from docker-compose as a build arg.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
# next.config.ts uses `output: 'standalone'`, so we only need the standalone
# server bundle + static assets + public/.
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
