# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app
ENV CI=true
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps/frontend/package.json ./apps/frontend/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter frontend... --store-dir /pnpm/store

COPY apps/frontend ./apps/frontend

RUN pnpm --filter @nestwell/shared-types build || true \
    && pnpm --filter frontend build

FROM nginx:1.27-alpine AS runner

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
