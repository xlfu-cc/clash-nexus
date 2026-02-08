# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies, optimize for caching
RUN npm ci && \
    cd web && npm ci && \
    npm cache clean --force

# Copy source files
COPY . .

# Build frontend
RUN cd web && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code
COPY server ./server

# Copy built frontend
COPY --from=builder /app/web/dist ./web/dist

# Create data directory
RUN mkdir -p /app/data && chown node:node /app/data

# Environment
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

EXPOSE 3000

# Install su-exec for privilege dropping
RUN apk add --no-cache su-exec

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Health check (wget is okay running as root since it reads public port)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/index.js"]
