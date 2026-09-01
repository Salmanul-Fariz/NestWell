# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy packages and app package definitions
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies across monorepo
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/backend ./apps/backend

# Build shared types & backend
RUN pnpm --filter @nestwell/shared-types build 2>/dev/null || true
RUN pnpm --filter backend build

# --- Production Runner Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built dist from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["node", "dist/main"]
