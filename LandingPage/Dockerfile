# syntax=docker/dockerfile:1
# Marketing site (Vite) served by nginx.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public config only — inlined into the bundle at build time.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_APP_URL
RUN npm run build

FROM nginx:1.29-alpine
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  location / { try_files $uri $uri/ /index.html; }
}
EOF
COPY --from=build /app/dist /usr/share/nginx/html
