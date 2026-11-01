# syntax=docker/dockerfile:1

# ---- build: needs dev dependencies (vite, tsc, rolldown) ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The Spotify client ID is public (it ships in the browser bundle), so a build arg is fine.
# Server secrets are never build args: they would be readable from the image history.
ARG VITE_SPOTIFY_CLIENT_ID
RUN VITE_SPOTIFY_CLIENT_ID="$VITE_SPOTIFY_CLIENT_ID" npm run build && npm run build:server

# ---- runtime: no node_modules, no source ----
# shortcut: tag not digest-pinned, so rebuilds pick up base-image patches unreviewed; pin the digest once Dependabot updates it (Stage 3).
FROM node:24-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
# Files stay root-owned, so the app user can read but not modify its own code.
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server/server.mjs ./server.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
CMD ["node", "server.mjs"]
