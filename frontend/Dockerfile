# Multi-stage build for the Vite React SPA. Stage 1 builds the static bundle;
# stage 2 serves it with nginx (static files + SPA fallback only, no API proxy).
FROM node:22-alpine AS build
WORKDIR /app
# Absolute API base baked into the bundle at build time. Every deployment must
# supply it (compose passes http://localhost:8080/api/v1, Railway the backend's
# public domain); when unset the SPA falls back to the same-origin '/api/v1'
# default in src/api/client.ts, which nothing serves anymore.
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# The config is a template: the image's entrypoint envsubsts defined env vars into it at start.
# BASIC_AUTH_REALM=off (default) keeps the site open; setting it to a word (plus BASIC_AUTH_USERS,
# see docker-entrypoint.d/40-htpasswd.sh) locks everything behind a browser login — the
# private-beta gate, toggled by env vars alone.
ENV BASIC_AUTH_REALM=off
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/40-htpasswd.sh /docker-entrypoint.d/40-htpasswd.sh
RUN chmod +x /docker-entrypoint.d/40-htpasswd.sh && touch /etc/nginx/.htpasswd
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
