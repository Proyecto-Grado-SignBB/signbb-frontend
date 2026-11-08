# Despliegue con PC propio y Cloudflare Tunnel

Este documento cubre el despliegue de respaldo: el mismo stack de
`compose.prod.yaml` ejecutado en un PC o portátil, expuesto a Internet con
Cloudflare Tunnel. No requiere IP pública ni abrir puertos en el router.

El túnel solo publica Caddy. PostgreSQL, Redis, Silo y el backend siguen en la
red interna de Docker.

## Archivos

| Archivo | Uso |
|---|---|
| `compose.prod.yaml` | Stack base (igual que el despliegue público) |
| `compose.tunnel.yaml` | Override: publica solo el 80 y monta el Caddyfile del túnel |
| `Caddyfile.tunnel` | Dos hostnames propios (Cloudflare Named Tunnel) |
| `Caddyfile.quick-tunnel` | Un hostname aleatorio; `ui-autoria` bajo `/autoria/` |
| `.env.prod.example` | Variables; copiar a `.env` |

## Requisitos

- PC o portátil con Ubuntu 24.04, Docker y el plugin Compose.
- 4 núcleos y 8 GB de RAM recomendados.
- Conexión por cable, suspensión y cierre de tapa desactivados.
- Cloudflare Tunnel instalado (`cloudflared`).
- Para el modo `tunnel`: un dominio administrado en Cloudflare.
- Para el modo `quick-tunnel`: no hace falta dominio, pero la URL es temporal.

## Configuración

```bash
cd signbb-frontend/deploy
cp .env.prod.example .env
chmod 600 .env
```

Editar `.env` como en el despliegue público y añadir el modo del túnel:

```dotenv
# tunnel: dos hostnames propios (recomendado)
# quick-tunnel: un hostname aleatorio y autoría bajo /autoria/
SIGNBB_TUNNEL_MODE=tunnel
```

Para el modo `quick-tunnel`, definir el subpath y compilar:

```dotenv
# En .env
AUTORIA_BASE_HREF=/autoria/
```

```bash
docker compose -f compose.prod.yaml -f compose.tunnel.yaml build
```

Para el modo `tunnel`, dejar `AUTORIA_BASE_HREF=/` (valor por defecto).

El base href queda compilado dentro de la imagen: si cambias entre `tunnel` y
`quick-tunnel`, vuelve a construir el servicio `web`.

## Primera puesta en marcha

```bash
docker compose -f compose.prod.yaml -f compose.tunnel.yaml up -d db cache silo
docker compose -f compose.prod.yaml -f compose.tunnel.yaml ps
docker compose -f compose.prod.yaml -f compose.tunnel.yaml up -d backend
docker compose -f compose.prod.yaml -f compose.tunnel.yaml logs -f backend
docker compose -f compose.prod.yaml -f compose.tunnel.yaml up -d web
docker compose -f compose.prod.yaml -f compose.tunnel.yaml logs -f web
```

Cuando la primera siembra termine, apagarla en `.env`:

```bash
sed -i 's/^SIGNBB_SIEMBRA_ACTIVA=.*/SIGNBB_SIEMBRA_ACTIVA=false/' .env
sed -i 's/^SIGNBB_SEED_DEMO_ACTIVA=.*/SIGNBB_SEED_DEMO_ACTIVA=false/' .env
docker compose -f compose.prod.yaml -f compose.tunnel.yaml up -d backend
```

## Cloudflare Named Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create signbb
```

Crear `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: consulta.<dominio>
    service: http://localhost:80
  - hostname: autoria.<dominio>
    service: http://localhost:80
  - service: http_status:404
```

Copiar las credenciales, crear los DNS y arrancar el servicio:

```bash
cloudflared tunnel route dns signbb consulta.<dominio>
cloudflared tunnel route dns signbb autoria.<dominio>

sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/<tunnel-id>.json /etc/cloudflared/
sudo chmod 600 /etc/cloudflared/config.yml /etc/cloudflared/<tunnel-id>.json

sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

En `Caddyfile.tunnel`, los hostnames se toman de
`SIGNBB_DOMINIO_CONSULTA` y `SIGNBB_DOMINIO_AUTORIA`.

## Cloudflare Quick Tunnel

```bash
cloudflared tunnel --url http://localhost:80
```

Usar la URL `https://<aleatorio>.trycloudflare.com` que imprime el comando.
Ponerla en `.env`:

```dotenv
SIGNBB_TUNNEL_MODE=quick-tunnel
SIGNBB_CORS_ORIGENES=https://<aleatorio>.trycloudflare.com
```

Recrear el backend para aplicar CORS:

```bash
docker compose -f compose.prod.yaml -f compose.tunnel.yaml up -d backend
```

No reiniciar el túnel después de instalar la PWA: la URL cambia y la PWA
instalada apunta a un origen que ya no existe.

## Ajustes en Cloudflare

- SSL/TLS: `Full (strict)` o `Automatic`; `Always Use HTTPS` activado.
- Caché: excluir `/ngsw.json`, `/ngsw-worker.js`, `/index.html` y
  `/manifest.webmanifest`; las respuestas de `/api/*` no se cachean.
- Rocket Loader: desactivado (puede romper Angular).
- Bot Fight Mode: desactivado para la demo y las pruebas con clientes HTTP.
- Cloudflare Access: opcional para `autoria.<dominio>`; no aplica al modo
  `quick-tunnel`.

## Validación

Desde un móvil con datos móviles, no desde la misma Wi-Fi:

```bash
curl -I https://consulta.<dominio>/
curl -fsS https://consulta.<dominio>/actuator/health
curl -I https://autoria.<dominio>/
```

Comprobar que el host solo publica el 80:

```bash
ss -ltnp | grep -E ':(80|443|5432|6379|9000|8080)\b'
```

Revisar el túnel:

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 100
```

## Baja

```bash
docker compose -f compose.prod.yaml -f compose.tunnel.yaml down -v
sudo cloudflared service uninstall
cloudflared tunnel delete signbb
```

Borrar los registros DNS en Cloudflare y apagar el equipo.

## Notas

- El túnel no es un entorno válido para medir rendimiento bajo carga: para eso
  usar la red local y el origen de Caddy.
- La disponibilidad medida incluye la conexión doméstica, la energía y
  Cloudflare; la cuenta gratuita no tiene SLA.
- No exponer SSH, PostgreSQL, Redis, Silo ni el backend a través del túnel.
