# syntax=docker/dockerfile:1

# --- Étape 1 : build de la PWA ---
FROM node:24-alpine AS build
WORKDIR /app

# Installer les dépendances (cache Docker tant que les lockfiles ne changent pas)
COPY package.json package-lock.json ./
RUN npm ci

# Builder l'app (tsc -b && vite build) → /app/dist
COPY . .
RUN npm run build

# --- Étape 2 : service statique via nginx ---
FROM nginx:1.27-alpine AS runtime

# Config nginx (SPA fallback + en-têtes PWA/cache)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefacts buildés
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
