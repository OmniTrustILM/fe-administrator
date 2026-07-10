# build environment
FROM node:24-alpine AS build

WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

RUN npm ci --silent --ignore-scripts
COPY src ./src
COPY public ./public
COPY index.html vite.config.js tsconfig.json ./
RUN npm run build

# production environment
FROM nginxinc/nginx-unprivileged:1.31.2-alpine

# Patch base-image OS packages for known CVEs (c-ares CVE-2026-33630, fixed in 1.34.8-r0)
USER root
RUN apk upgrade --no-cache c-ares
USER nginx

WORKDIR /usr/share/nginx/html

ENV API_URL=/api
ENV LOGIN_URL=/login
ENV LOGOUT_URL=/logout
ENV ENABLE_PROXIES=true
ENV ENABLE_TRUSTED_CERTIFICATES=true

COPY --from=build /app/build .