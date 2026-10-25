# =============================================================================
# Imagen del frontend PWA de SignBB
# =============================================================================
# Construye ui-consulta en modo producción y la sirve con Caddy, que además
# hace de proxy inverso de /api y /media hacia el backend.
#
# El contexto de construcción es la raíz del repo del frontend:
#   docker build -f deploy/Dockerfile -t signbb-web .
# o, desde deploy/:
#   docker compose up -d --build
#
# ui-compartida se compila primero porque tsconfig.json resuelve el import
# "ui-compartida" contra dist/ui-compartida.
# =============================================================================

# --- Etapa 1: compilación ----------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias primero: si solo cambia el código, Docker reutiliza la capa.
COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json ./
COPY projects ./projects

RUN npm run build -- --project ui-compartida \
    && npm run build -- --project ui-consulta

# --- Etapa 2: servidor web ---------------------------------------------------
FROM caddy:2-alpine

# La aplicación de consulta es la única PWA del workspace.
COPY --from=build /app/dist/ui-consulta/browser /srv

# Caddy lee las variables SIGNBB_DOMINIO y SIGNBB_BACKEND del entorno.
COPY deploy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
