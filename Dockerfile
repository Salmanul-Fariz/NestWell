FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY . .

RUN pnpm install --frozen-lockfile && pnpm build

WORKDIR /app/apps/backend
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/main"]
