# syntax=docker/dockerfile:1

# ---- build: needs dev dependencies (vite, tsc, rolldown) ----
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The Spotify client ID is public (it ships in the browser bundle), so a build arg is fine.
# Server secrets are never build args: they would be readable from the image history.
ARG VITE_SPOTIFY_CLIENT_ID
RUN VITE_SPOTIFY_CLIENT_ID="$VITE_SPOTIFY_CLIENT_ID" npm run build && npm run build:server

# ---- runtime: no node_modules, no source ----
# Base image pinned by digest (multi-arch index); Dependabot proposes updates.
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94
ENV NODE_ENV=production PORT=8080
# The app only needs the node binary. npm and corepack ship their own dependencies,
# which is where all of Trivy's HIGH findings were; remove them from the runtime.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
# Files stay root-owned, so the app user can read but not modify its own code.
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server/server.mjs ./server.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
CMD ["node", "server.mjs"]
