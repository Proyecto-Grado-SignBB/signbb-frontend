# =============================================================================
# Imagen del frontend de SignBB (consulta + autoría)
# =============================================================================
# Construye ui-consulta (PWA) y ui-autoria en modo producción y las sirve con
# Caddy, que además hace de proxy inverso de /api y /media hacia el backend.
#
# El contexto de construcción es la raíz del repo del frontend:
#   docker build -f deploy/Dockerfile -t signbb-web .
# o, desde deploy/:
#   docker compose -f compose.prod.yaml up -d --build
#
# ui-compartida se compila primero porque tsconfig.json resuelve el import
# "ui-compartida" contra dist/ui-compartida.
# =============================================================================

# --- Etapa 1: compilación ----------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Las compilaciones de Angular pueden necesitar más heap en máquinas pequeñas.
ENV NODE_OPTIONS=--max-old-space-size=2048

# Dependencias primero: si solo cambia el código, Docker reutiliza la capa.
COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json ./
COPY projects ./projects

RUN npm run build -- --project ui-compartida \
    && npm run build -- --project ui-consulta \
    && npm run build -- --project ui-autoria

# --- Etapa 2: servidor web ---------------------------------------------------
FROM caddy:2-alpine

# La aplicación de consulta es la única PWA del workspace; autoría se sirve
# como SPA en su propio host (o bajo /autoria/ en el despliegue con túnel).
COPY --from=build /app/dist/ui-consulta/browser /srv-consulta
COPY --from=build /app/dist/ui-autoria/browser /srv-autoria

# Caddy lee SIGNBB_DOMINIO_CONSULTA, SIGNBB_DOMINIO_AUTORIA y SIGNBB_BACKEND
# del entorno.
COPY deploy/Caddyfile.prod /etc/caddy/Caddyfile

EXPOSE 80 443
