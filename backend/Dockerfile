# syntax=docker/dockerfile:1.7

# ---------- Stage 1: install production dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Toolchain for native modules (bcrypt, sharp); removed after install.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && apk add --no-cache vips-dev

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && apk del .build-deps

# ---------- Stage 2: minimal runtime image ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=3000

# vips: runtime lib for sharp. tini: proper PID 1 / signal forwarding.
RUN apk add --no-cache vips tini \
    && addgroup -S app && adduser -S app -G app

COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app src ./src

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
