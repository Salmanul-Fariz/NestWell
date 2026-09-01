# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy packages and app package definitions
COPY packages ./packages
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY apps/frontend ./apps/frontend

# Build frontend production bundle
RUN pnpm --filter @nestwell/shared-types build 2>/dev/null || true
RUN pnpm --filter frontend build

# --- Production Nginx Stage ---
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Custom nginx config for SPA routing and API proxy
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /api/v1/ { \
        proxy_pass http://backend:3000/api/v1/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
