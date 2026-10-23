# syntax=docker/dockerfile:1
# Portal web build (Expo Router single-page export) served by nginx.
# Android/iOS are native builds: `eas build`, not Docker.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public config only — inlined into the bundle at export time.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npx expo export --platform web

FROM nginx:1.29-alpine
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  location / { try_files $uri $uri/ /index.html; }
}
EOF
COPY --from=build /app/dist /usr/share/nginx/html
