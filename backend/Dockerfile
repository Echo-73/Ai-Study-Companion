# Production Dockerfile for AI Study Companion Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and backend package definitions
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies (workspaces supported)
RUN npm install

# Copy backend source and prisma schema
COPY backend ./backend

WORKDIR /app/backend

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV UPLOADS_DIR=/app/uploads

# Install runtime tools (openssl required for Prisma engine on Alpine)
RUN apk add --no-cache openssl

# Copy package definitions
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm install --omit=dev

WORKDIR /app/backend

# Copy built application and prisma definitions from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Create persistent storage folder for uploaded PDFs
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

# Run prisma migration deploy on startup followed by server
CMD ["node", "dist/server.js"]
