# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=base /app /app

# Non-root user
USER appuser

EXPOSE 5000

# Graceful shutdown — Docker sends SIGTERM
STOPSIGNAL SIGTERM

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
