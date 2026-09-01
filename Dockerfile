FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# 1) Install — this layer is reused unless lockfile / package.json change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile

# 2) Frontend bundle (skip tsc — Vite type-checks enough for a container build)
COPY packages ./packages
COPY apps/frontend ./apps/frontend
RUN pnpm --filter frontend run build:vite

# 3) Backend compile
COPY apps/backend ./apps/backend
RUN pnpm --filter backend build

WORKDIR /app/apps/backend
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/main"]
