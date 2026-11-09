# Despliegue de la PWA de consulta (Caddy + Docker)

> Para el despliegue público con dominio, HTTPS y las dos aplicaciones
> (`ui-consulta` y `ui-autoria`), ver `README-prod.md`.

Este directorio contiene el despliegue de `ui-consulta` como PWA instalable en
una red local, con HTTPS y sin CORS: Caddy sirve el frontend y hace de proxy
inverso de `/api` y `/media` hacia el backend.

## Arquitectura

```
Móvil / PC en la LAN
        │  https://192.168.20.217  (o el nombre configurado)
        ▼
Caddy :443
  ├── /            → /srv (dist/ui-consulta/browser)
  ├── /api/*       → backend 127.0.0.1:8080
  └── /media/*     → backend 127.0.0.1:8080
```

- **Mismo origen** para la UI y la API: no hay CORS ni contenido mixto.
- El frontend se compila en la imagen; no hace falta Node en el host.
- El certificado lo emite la CA interna de Caddy (`tls internal`). No existe
  un certificado público válido para una IP privada, así que la CA raíz se
  instala una vez en cada dispositivo.
- El backend no se publica a la LAN: Caddy lo alcanza por `127.0.0.1:8080`.

## Requisitos

- Docker y Docker Compose.
- Puerto **443** libre. El 80 no se abre: Caddy tiene desactivada la
  redirección `http://` → `https://`, así que nginx puede seguir ocupándolo.
  Si se quiere redirección, liberar el 80 y quitar
  `auto_https disable_redirects` del `Caddyfile`.
  ```bash
  ss -ltnp | grep -E ':(80|443)\b'
  sudo systemctl disable --now nginx   # solo si se quiere liberar el 80
  ```
- Backend de SignBB escuchando en `127.0.0.1:8080` (con
  `./mvnw spring-boot:run` o con el compose del backend).
- IP estable para el equipo: reserva DHCP en el router o configuración
  estática. Si cambia la IP, la PWA instalada deja de ser el mismo origen.

## Configuración

```bash
cd deploy
cp .env.example .env
```

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `SIGNBB_DOMINIO` | IP o nombre por el que se accede a la PWA | `192.168.20.217` |
| `SIGNBB_BACKEND` | Destino de `/api` y `/media` | `127.0.0.1:8080` |

El `.env` no se versiona. El `Caddyfile` usa `tls internal`; si más adelante
se pasa a un dominio público con DNS-01, se quita esa línea y se añade el
bloque `tls { dns ... }`.

## Puesta en marcha

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

Abrir siempre con `https://`; Caddy no escucha en HTTP. Comprobar desde el
host:

```bash
curl -vk https://192.168.20.217/
```

`-k` es necesario hasta instalar la CA en el host; desde el móvil, tras
instalarla, el candado debe ser válido.

## Operación de los contenedores

```bash
# Estado y logs
docker compose ps
docker compose logs -f web
docker compose logs --tail=200 web

# Reiniciar / parar / arrancar
docker compose restart web
docker compose stop web
docker compose start web

# Baja conservando CA, certificados y configuración
docker compose down

# Baja borrando volúmenes (¡cambia la CA! hay que reinstalarla en los móviles)
docker compose down -v

# Recompilar tras un cambio del frontend o del Caddyfile
docker compose build --no-cache web
docker compose up -d web

# Validar y recargar Caddy sin recrear el contenedor
docker compose exec web caddy validate --config /etc/caddy/Caddyfile
docker compose exec web caddy reload --config /etc/caddy/Caddyfile
```

Los volúmenes tienen nombre fijo para que los comandos de backup sean
predecibles: `signbb_caddy_data` (CA y certificados) y
`signbb_caddy_config` (configuración autoservida de Caddy).

### Actualizar la PWA

```bash
docker compose up -d --build
```

El service worker de Angular descarga la versión nueva y la activa al recargar.
Si una demo se queda con la versión anterior, cerrar y volver a abrir la PWA,
o hacer una recarga forzada desde el navegador.

## Instalar la CA en los dispositivos

Caddy guarda su CA raíz en el volumen `signbb_caddy_data`:

```bash
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

- **Android**: Ajustes → Seguridad → Cifrado y credenciales → Instalar un
  certificado → Certificado de CA → seleccionar `caddy-root.crt`. Reiniciar
  Chrome si el candado no cambia.
- **iOS**: enviar el archivo al dispositivo e instalarlo (Ajustes → General →
  VPN y gestión de dispositivos → Instalar perfil). Después, Ajustes →
  General → Información → Ajustes de confianza de certificados → habilitar la
  confianza total para la CA de Caddy.
- **PC**: si se quiere abrir `https://192.168.20.217` desde un PC sin el aviso
  del navegador ni `curl -k`, instalar la CA como se explica a continuación.

### Instalar la CA en un PC

Solo es necesario si ese PC va a abrir `https://192.168.20.217` como cliente.
El archivo es `caddy-root.crt` (PEM), copiado del contenedor en el paso
anterior. Instálala únicamente en equipos de confianza: esa CA puede firmar
certificados para cualquier nombre.

#### Linux (Debian / Ubuntu)

```bash
sudo cp caddy-root.crt /usr/local/share/ca-certificates/caddy-root.crt
sudo update-ca-certificates
# debe terminar con "1 added"
```

Esto hace que `curl`, `wget`, `openssl` y el resto del sistema confíen.
**Chrome/Chromium en Linux usa NSS y puede necesitar un paso aparte:**

- Abrir `chrome://settings/certificates` → *Autoridades* → *Importar* →
  `caddy-root.crt` → confiar para identificar sitios.
- O por consola (requiere `libnss3-tools`):

```bash
sudo apt install libnss3-tools

# Chrome M146+ usa ~/.local/share/pki/nssdb; versiones anteriores ~/.pki/nssdb.
# Si existe el directorio antiguo, Chrome sigue usando ese.
NSSDB="$HOME/.local/share/pki/nssdb"
[ -d "$HOME/.pki/nssdb" ] && NSSDB="$HOME/.pki/nssdb"
mkdir -p "$NSSDB"
[ -f "$NSSDB/cert9.db" ] || certutil -N --empty-password -d sql:"$NSSDB"
certutil -d sql:"$NSSDB" -A -t "C,," -n "Caddy Local Authority" -i caddy-root.crt
certutil -d sql:"$NSSDB" -L | grep -i caddy
```

Reiniciar Chrome después.

#### macOS

Para todo el sistema (recomendado):

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain caddy-root.crt
```

Solo para el usuario actual:

```bash
security add-trusted-cert -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" caddy-root.crt
```

También se puede hacer con doble clic en `caddy-root.crt`: se abre *Acceso a
Llaveros*, se elige el llavero *Sistema*, se abre la CA y en *Confiar* se
selecciona *Confiar siempre*.

Safari y Chrome usan el llavero del sistema; reiniciar el navegador.

#### Windows

PowerShell como administrador:

```powershell
Import-Certificate -FilePath .\caddy-root.crt `
  -CertStoreLocation Cert:\LocalMachine\Root
```

Solo para el usuario actual (sin administrador):

```powershell
Import-Certificate -FilePath .\caddy-root.crt `
  -CertStoreLocation Cert:\CurrentUser\Root
```

Alternativa con el símbolo del sistema como administrador:

```bat
certutil -addstore -f "ROOT" caddy-root.crt
```

Chrome y Edge usan el almacén de Windows; reiniciar el navegador.

Comprobar:

```powershell
Get-ChildItem Cert:\LocalMachine\Root | Where-Object Subject -match 'Caddy'
# o:
certutil -store Root | findstr /i caddy
```

#### Firefox (Linux, macOS y Windows)

Firefox **no** usa el almacén del sistema por defecto; hay que importar la CA
también allí:

*Ajustes* → *Privacidad y seguridad* → *Certificados* → *Ver certificados* →
*Autoridades* → *Importar* → `caddy-root.crt` → marcar *Confiar en esta CA
para identificar sitios web*.

Alternativa: activar `security.enterprise_roots.enabled=true` en
`about:config` para que Firefox use el almacén del sistema, y reiniciar.

#### Verificar en cualquier PC

```bash
curl -I https://192.168.20.217/
# sin -k; debe responder 200

openssl s_client -connect 192.168.20.217:443 </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer -subject
```

El emisor debe ser `Caddy Local Authority`. En el navegador, el candado debe
ser válido y sin aviso.

Si sigue fallando:

- reiniciar el navegador;
- en Chrome/Chromium de Linux, revisar el almacén NSS;
- en Firefox, importar la CA en Firefox;
- comprobar que se accede por la misma IP o nombre para el que se emitió el
  certificado.

Si solo quieres probar desde el propio servidor sin instalar nada:

```bash
curl --cacert caddy-root.crt https://192.168.20.217/
```

#### Quitar la CA (opcional)

```bash
# Debian / Ubuntu
sudo rm /usr/local/share/ca-certificates/caddy-root.crt
sudo update-ca-certificates --fresh

# Chrome/Chromium (si se añadió a NSS)
NSSDB="$HOME/.local/share/pki/nssdb"
[ -d "$HOME/.pki/nssdb" ] && NSSDB="$HOME/.pki/nssdb"
certutil -d sql:"$NSSDB" -D -n "Caddy Local Authority"

# macOS
sudo security delete-certificate -c "Caddy Local Authority" \
  /Library/Keychains/System.keychain

# Windows (administrador)
certutil -delstore Root "Caddy Local Authority"
```

La CA sobrevive a reinicios y a `docker compose down`. Solo cambia si se borra
el volumen (`down -v`) o se elimina el volumen a mano; en ese caso hay que
volver a instalar el nuevo `root.crt` en todos los dispositivos.

### Backup y restauración de la CA

```bash
# Copia de seguridad
docker run --rm \
  -v signbb_caddy_data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/signbb_caddy_data.tgz -C /data .

# Restauración (detener Caddy antes)
docker compose stop web
docker run --rm \
  -v signbb_caddy_data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cd /data && tar xzf /backup/signbb_caddy_data.tgz'
docker compose start web
```

## Instalar la PWA

1. Abrir `https://192.168.20.217` en el móvil y comprobar que el candado es
   válido (sin aviso de certificado).
2. **Android (Chrome)**: menú → *Instalar aplicación* o *Añadir a pantalla de
   inicio*.
3. **iOS (Safari)**: Compartir → *Añadir a pantalla de inicio*. No usar Chrome
   en iOS para instalar.
4. Verificar en el escritorio (Chrome DevTools → Application):
   - *Manifest*: aplicación instalable.
   - *Service Workers*: `ngsw-worker.js` activo y controlando la página.
5. Probar un recorrido real. Sin conexión, la interfaz debe abrir desde la
   caché, pero el recorrido fallará porque la API necesita red (así lo define
   el SRS).

Recuerda: el service worker **solo está activo en la compilación de
producción**; `ng serve` no sirve para probar la instalación.

## Integración con el backend

- **Backend en el host** (`./mvnw spring-boot:run`): funciona con
  `SIGNBB_BACKEND=127.0.0.1:8080`.
- **Backend en Docker** con `signbb-backend/contenedores/compose.yaml`: el
  compose publica `127.0.0.1:8080`, así que también funciona.
- **Otro equipo**: cambiar `SIGNBB_BACKEND` al host/puerto correspondiente.
- **Red bridge en vez de host**: habría que usar
  `host.docker.internal:8080` y `extra_hosts: ["host.docker.internal:host-gateway"]`;
  además, el backend no debe estar publicado solo en `127.0.0.1` para que el
  contenedor lo alcance. Por eso este despliegue usa `network_mode: host`.

Configuración recomendada del backend detrás de Caddy:

`application.properties` activa por defecto
`server.forward-headers-strategy=framework`, de modo que Spring ve el esquema
`https` y el host original a través de Caddy. Sin esto, una petición `POST`
con cabecera `Origin` puede interpretarse como CORS y responder
`403 Invalid CORS request`. Aunque la UI y la API compartan origen, conviene
dejar el origen HTTPS permitido como defensa en profundidad:

```properties
SIGNBB_CORS_ORIGENES=https://192.168.20.217,http://localhost:4200,http://localhost:4300
```

En producción, además:

```properties
SIGNBB_ENTORNO=produccion
SIGNBB_DOCS_ACTIVAS=false
SIGNBB_SHOW_SQL=false
SIGNBB_JWT_SECRETO=<secreto propio>
SIGNBB_SUPERVISOR_CONTRASENA=<contraseña propia>
SIGNBB_MEDIA_ACCESS_KEY=<clave propia>
SIGNBB_MEDIA_SECRET_KEY=<secreto propio>
SIGNBB_SIEMBRA_ACTIVA=false   # después del primer arranque
```

## Diagnóstico

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `docker compose up` falla con “address already in use” | Otro servicio en 443 | Liberar el 443 o cambiar de equipo/puerto y comprobar con `ss` |
| El móvil muestra aviso de certificado | CA de Caddy no instalada o volumen recreado | Copiar e instalar `root.crt` |
| La PWA no ofrece instalarse | HTTP, certificado no válido, build de desarrollo o service worker no activo | Usar HTTPS, build de producción, revisar DevTools → Application |
| `502 Bad Gateway` | Backend caído o en otro puerto | `curl localhost:8080/actuator/health`, revisar `SIGNBB_BACKEND` |
| `403 Invalid CORS request` al iniciar sesión | Spring no ve el esquema/host originales | `SERVER_FORWARD_HEADERS_STRATEGY=framework` y/o añadir el origen HTTPS a `SIGNBB_CORS_ORIGENES` |
| Cambios del frontend no aparecen | Caché del service worker | Recargar, cerrar y abrir la PWA, o borrar datos del sitio |
| La PWA instalada deja de funcionar | Cambió la IP o el dominio | Reservar IP; reinstalar la PWA con el nuevo origen |

## Seguridad

- Este despliegue es **solo para LAN**. No abrir el 443 a Internet con la CA
  interna.
- No publicar PostgreSQL (`5432`), Redis (`6379`), Silo (`9000`/`9001`) ni el
  backend (`8080`) en la red; deben quedar en `127.0.0.1`.
- No versionar `deploy/.env` ni los secretos de producción.
- No añadir HSTS hasta confirmar que la CA está bien instalada en todos los
  dispositivos; un HSTS mal configurado puede dejar el móvil sin acceso.
- La CA interna de Caddy solo debe estar instalada en dispositivos de
  confianza.

## Pasar a un dominio público (fase 2)

Sin tocar el frontend (`apiUrl` ya es `/api`):

1. Crear un dominio o subdominio cuyo registro A apunte a la IP privada del
   servidor (o usar DNS local).
2. Compilar Caddy con el plugin DNS del proveedor y configurar
   `tls { dns ... }` en lugar de `tls internal`.
3. Ajustar `SIGNBB_DOMINIO` y `SIGNBB_CORS_ORIGENES`.
4. Recompilar la imagen de Caddy y reiniciar el servicio.

El certificado será público y no habrá que instalar la CA en los móviles. Si
el acceso desde fuera de la LAN no es necesario, el registro A puede seguir
apuntando a la IP privada y el tráfico no sale de la red local.
