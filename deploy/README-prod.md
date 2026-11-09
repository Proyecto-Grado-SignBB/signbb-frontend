# Despliegue público de SignBB

Este directorio contiene el despliegue del sistema completo en un host Linux
con Docker:

- `ui-consulta` (PWA) en `consulta.<dominio>`
- `ui-autoria` en `autoria.<dominio>`
- backend Spring Boot
- PostgreSQL 16
- Redis 8
- Silo (almacenamiento S3 de imágenes)
- Caddy como única entrada pública, con HTTPS automático y proxy de
  `/api`, `/media` y `/actuator/health`

Solo el servicio `web` publica puertos en el host. PostgreSQL, Redis, Silo y el
backend quedan en la red interna de Docker.

## Archivos

| Archivo | Uso |
|---|---|
| `compose.prod.yaml` | Stack completo de producción |
| `Caddyfile.prod` | Sitios de consulta y autoría, TLS y proxy |
| `Dockerfile` | Compila `ui-consulta` y `ui-autoria` y las sirve con Caddy |
| `.env.prod.example` | Plantilla de variables; copiar a `.env` |
| `README-prod.md` | Este documento |

El despliegue asume que los repositorios `signbb-backend` y `signbb-frontend`
están uno al lado del otro:

```text
/opt/signbb/
  signbb-backend/
  signbb-frontend/
```

El build del backend usa `../../signbb-backend/backend` desde este directorio.

## Requisitos

- Docker Engine y el plugin `docker compose`.
- Puertos 80 y 443 abiertos en el firewall del proveedor y del sistema.
- DNS: dos registros `A` (o `CNAME` si se usa Cloudflare) apuntando al host:

  ```text
  consulta.<dominio>  A  <IP>
  autoria.<dominio>   A  <IP>
  ```

  Sin dominio se puede usar `consulta.<IP>.sslip.io` y
  `autoria.<IP>.sslip.io`; Caddy obtiene el certificado igualmente.
- Repositorios clonados en el commit que se va a desplegar.

## Configuración

```bash
cd signbb-frontend/deploy
cp .env.prod.example .env
chmod 600 .env
```

Editar `.env`:

- `SIGNBB_DOMINIO_CONSULTA` y `SIGNBB_DOMINIO_AUTORIA`: los hostnames públicos.
- `SIGNBB_CORS_ORIGENES`: exactamente
  `https://consulta.<dominio>,https://autoria.<dominio>`.
- `SIGNBB_DB_CONTRASENA`, `SIGNBB_JWT_SECRETO` y
  `SIGNBB_SUPERVISOR_CONTRASENA`: valores generados con
  `openssl rand -base64 48` (JWT) o `openssl rand -base64 24` (contraseñas).
- `SIGNBB_MEDIA_ACCESS_KEY`: `openssl rand -hex 16` (sin `/`, `+` ni `=`,
  porque forma parte de la cadena de credenciales SigV4).
- `SIGNBB_MEDIA_SECRET_KEY`: `openssl rand -base64 24`.
- `SIGNBB_ENTORNO=produccion` para el despliegue final.
- `SIGNBB_DOCS_ACTIVAS=false` y `SIGNBB_SHOW_SQL=false`.
- `SIGNBB_SIEMBRA_ACTIVA=true` solo en el primer arranque; después se apaga.
- `SIGNBB_SEED_DEMO_ACTIVA=false` por defecto. El seed de demo no se puede
  activar con `SIGNBB_ENTORNO=produccion`; para sembrarlo, sigue la secuencia
  de la sección "Primer arranque".
- Si se usa el seed de demo, cambiar sus contraseñas.

El backend no arranca en producción si conserva el secreto JWT, la contraseña
del supervisor o las claves de Silo de ejemplo, o si Swagger o el registro SQL
siguen activos.

## Primer arranque

```bash
cd signbb-frontend/deploy

# 1. Construir las imágenes
docker compose -f compose.prod.yaml build

# 2. Levantar la infraestructura
docker compose -f compose.prod.yaml up -d db cache silo
docker compose -f compose.prod.yaml ps
```

### Con datos de demostración

El seed de demo no se puede activar con `SIGNBB_ENTORNO=produccion`. En una
base nueva, siembra primero en desarrollo:

```dotenv
# En .env
SIGNBB_ENTORNO=desarrollo
SIGNBB_SIEMBRA_ACTIVA=true
SIGNBB_SEED_DEMO_ACTIVA=true
```

```bash
docker compose -f compose.prod.yaml up -d backend
docker compose -f compose.prod.yaml logs -f backend
# esperar: "Seed demo terminado: médico ..., 4 subgrafo(s) publicado(s)."
```

Después, pasar a producción:

```dotenv
SIGNBB_ENTORNO=produccion
SIGNBB_SIEMBRA_ACTIVA=false
SIGNBB_SEED_DEMO_ACTIVA=false
```

```bash
docker compose -f compose.prod.yaml up -d --force-recreate backend
docker compose -f compose.prod.yaml logs -f backend
# esperar: "Entorno de producción: ..." y "Started BackendApplication"
```

### Sin datos de demostración

```dotenv
SIGNBB_ENTORNO=produccion
SIGNBB_SIEMBRA_ACTIVA=true
SIGNBB_SEED_DEMO_ACTIVA=false
```

```bash
docker compose -f compose.prod.yaml up -d backend
docker compose -f compose.prod.yaml logs -f backend
# esperar la siembra del grafo raíz y "Started BackendApplication"
```

Luego cambia `SIGNBB_SIEMBRA_ACTIVA=false` y recrea el backend.

### Arrancar Caddy

```bash
docker compose -f compose.prod.yaml up -d web
docker compose -f compose.prod.yaml logs -f web
```

En los logs del backend deben aparecer las migraciones de Flyway, la siembra
del grafo raíz y, si está activa, la del demo. En los logs de Caddy debe
aparecer la emisión de los certificados.

Si Caddy no obtiene el certificado:

- comprobar que los dos hostnames resuelven a la IP;
- comprobar que el puerto 80 llega desde Internet;
- comprobar que no hay otro proceso ocupando 80/443;
- revisar los errores ACME en los logs.

## Pasar a producción

Después de sembrar, con o sin datos de demo, deja el backend en producción:

```bash
sed -i 's/^SIGNBB_ENTORNO=.*/SIGNBB_ENTORNO=produccion/' .env
sed -i 's/^SIGNBB_SIEMBRA_ACTIVA=.*/SIGNBB_SIEMBRA_ACTIVA=false/' .env
sed -i 's/^SIGNBB_SEED_DEMO_ACTIVA=.*/SIGNBB_SEED_DEMO_ACTIVA=false/' .env
docker compose -f compose.prod.yaml up -d --force-recreate backend
```

Si no usaste el seed de demo, este paso sigue siendo necesario para apagar
`SIGNBB_SIEMBRA_ACTIVA`; el grafo raíz ya está en la base.

## Validación

```bash
curl -I https://consulta.<dominio>/
curl -fsS https://consulta.<dominio>/actuator/health
curl -I https://autoria.<dominio>/
```

Comprobar que solo están publicados los puertos esperados:

```bash
ss -ltnp | grep -E ':(22|80|443|5432|6379|9000|8080)\b'
```

Solo deben aparecer 22, 80 y 443. Si aparece 5432, 6379, 9000 u 8080, revisar
`compose.prod.yaml`.

Comprobar los contenedores:

```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=100 web backend
```

Prueba funcional mínima:

- abrir la PWA desde un móvil con datos móviles (no la misma Wi-Fi);
- instalarla y comprobar el service worker en DevTools → Application;
- iniciar sesión como padre, iniciar un recorrido y responder una pregunta;
- iniciar sesión como médico en `autoria.<dominio>`;
- iniciar sesión como supervisor y abrir la revisión;
- subir y recuperar una imagen de pregunta.

## Operación

```bash
# Estado y logs
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f web
docker compose -f compose.prod.yaml logs -f backend

# Reiniciar
docker compose -f compose.prod.yaml restart backend
docker compose -f compose.prod.yaml restart web
```

### Backup

```bash
# PostgreSQL
docker compose -f compose.prod.yaml exec -T db \
  pg_dump -U admin signbb > backup-$(date +%F).sql

# Silo
docker run --rm \
  -v signbb_silo_data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/silo-$(date +%F).tgz -C /data .

# Secretos
cp .env .env.backup-$(date +%F)
chmod 600 .env.backup-*
```

### Actualización

```bash
cd /opt/signbb
git -C signbb-backend pull
git -C signbb-frontend pull
cd signbb-frontend/deploy
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d
```

Flyway aplica las migraciones nuevas al arrancar el backend.

### Baja

```bash
docker compose -f compose.prod.yaml down -v   # destructivo: borra volúmenes
```

Después, borrar los registros DNS y destruir el host o la instancia.

## Notas

- No se despliega Adminer.
- No se usa `network_mode: host`.
- No se publican PostgreSQL, Redis, Silo ni el backend.
- No habilitar HSTS hasta comprobar que el certificado funciona en todos los
  dispositivos de prueba.
