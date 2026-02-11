# Cognosis Backend API - Cloud Run Dockerfile
# Multi-stage build for optimized production image

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for Prisma generate)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules with generated Prisma Client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy application source
COPY --chown=nodejs:nodejs . .

# Remove development/test files not needed in production
RUN rm -f .env .env.example test-*.js debug-*.js migrate-*.js check-*.js

# Make startup script executable
RUN chmod +x start.sh

# Switch to non-root user
USER nodejs

# Cloud Run requires port 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Use dumb-init as PID 1 to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with migration script
CMD ["sh", "start.sh"]
