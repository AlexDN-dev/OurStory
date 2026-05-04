# ─── Builder ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Build tools needed for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Runner ──────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000 \
    DATA_DIR=/data \
    UPLOADS_DIR=/uploads

# Copy built output and the better-sqlite3 native module
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/package.json ./package.json

# Persistent dirs (mount as volumes)
RUN mkdir -p /data /uploads

VOLUME ["/data", "/uploads"]

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
