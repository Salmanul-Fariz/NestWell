# syntax=docker/dockerfile:1

# Install backend (+ workspace libs) once. The runner copies that output —
# it does not talk to the npm registry again.
FROM node:22-alpine AS builder

WORKDIR /app
ENV CI=true
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/

# Cache the pnpm store across builds. Only backend (and its deps) are installed —
# not the Vite/React tree.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter backend... --store-dir /pnpm/store

COPY apps/backend ./apps/backend

RUN pnpm --filter @nestwell/shared-types build || true \
    && pnpm --filter backend build \
    && pnpm --filter backend deploy --prod --legacy /out

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=node:node /out ./
COPY --from=builder --chown=node:node /app/apps/backend/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
