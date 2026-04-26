# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build the Angular bundle ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration production

# ---------- Stage 2: serve static assets via nginx ----------
FROM nginx:1.27-alpine AS runner

# envsubst for runtime templating of the backend URL.
RUN apk add --no-cache gettext \
    && rm -rf /usr/share/nginx/html/*

# Angular 20 application builder emits to dist/<project>/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh

# BACKEND_URL is the upstream API origin, e.g. https://flowcraft-api.onrender.com
ENV BACKEND_URL=http://localhost:3000 \
    PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1
