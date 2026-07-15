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
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
