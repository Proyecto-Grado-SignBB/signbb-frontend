# signbb-frontend

Frontend de **SignBB**, sistema de apoyo al triaje clínico guiado por un grafo
navegable. Workspace Angular con tres proyectos:

| Proyecto        | Qué es                                            | Puerto dev |
|-----------------|---------------------------------------------------|-----------:|
| `ui-consulta`   | App de la cuidadora: recorrido del grafo clínico  | 4200       |
| `ui-autoria`    | App del médico: lienzo y publicación de subgrafos | 4300       |
| `ui-compartida` | Librería de componentes y tipos compartidos       | —          |

- **Stack:** Angular 20.3, componentes standalone, SCSS, PWA (service worker),
  TypeScript 5.9, Karma + Jasmine.
- La API del backend (`/api`) se sirve aparte; ver `signbb-backend`.

## Requisitos

- Node.js (v20, v22 o v24) y npm.
- El backend corriendo en `http://localhost:8080/api` para que las apps funcionen.

## Instalación

```bash
npm install
npx ng build ui-compartida   # la librería se compila antes que las apps
```

## Desarrollo

```bash
npx ng serve ui-consulta   # http://localhost:4200
npx ng serve ui-autoria    # http://localhost:4300
```

`npm start` equivale a `ng serve`; como el workspace no tiene proyecto por
defecto, hay que indicar el proyecto.

## Construcción (build)

```bash
npx ng build ui-compartida
npx ng build ui-consulta   # producción por defecto (activa el service worker)
npx ng build ui-autoria
```

- La salida queda en `dist/<proyecto>`.
- Para un build sin optimizar: `npx ng build <proyecto> --configuration development`.
- La URL de la API por entorno está en `projects/<app>/src/environments/`:
  `environment.development.ts` usa `http://localhost:8080/api` y
  `environment.ts` (producción) usa la ruta relativa `/api`. En producción,
  Caddy sirve la PWA y hace proxy de `/api` y `/media` al backend, de modo que
  el mismo build funciona con cualquier dominio o IP.

## Despliegue PWA (Docker + Caddy)

`ui-consulta` se despliega como PWA instalable con HTTPS en una red local.
El despliegue autónomo (build de producción + Caddy + proxy al backend) está
en [`deploy/`](deploy/):

```bash
cd deploy
cp .env.example .env
docker compose up -d --build
```

Allí se documentan la CA interna de Caddy, la instalación en Android/iOS, el
ciclo de vida de los contenedores, las actualizaciones y el diagnóstico. Para
un dominio público con certificado válido (fase 2), ver la sección final de
[`deploy/README.md`](deploy/README.md).

## Entorno de pruebas y demo

Para probar las apps con datos reales, arranca el backend con el seed de demo:

```bash
cd ../signbb-backend/backend
SIGNBB_SIEMBRA_ACTIVA=true SIGNBB_SEED_DEMO_ACTIVA=true ./mvnw spring-boot:run
```

O con Docker:

```bash
cd ../signbb-backend/contenedores
SIGNBB_SEED_DEMO_ACTIVA=true docker compose up -d --build
```

Cuentas de desarrollo:

- Médico: `medico.ejemplo@signbb.local` / `Medico123`.
- Padre: `padre.ejemplo@signbb.local` / `Padre123`.
- Supervisor: `supervisor@signbb.local` / `Supervisor123`.

El detalle de usuarios, grafos, reglas y comandos está en
`signbb-backend/docs/entorno-pruebas/entorno-pruebas.md` (workspace).

Con el backend arriba, las apps se levantan así:

```bash
npx ng serve ui-consulta   # http://localhost:4200
npx ng serve ui-autoria    # http://localhost:4300
```

## Pruebas

```bash
npx ng test --watch=false                         # todos los proyectos
npx ng test ui-consulta --watch=false
npx ng test ui-autoria --watch=false
npx ng test ui-compartida --watch=false
npx ng test ui-consulta --include='projects/ui-consulta/src/app/.../x.spec.ts' --watch=false
npm test                                          # watcher
```

Para generar la cobertura:

```bash
npx ng test --watch=false --code-coverage
# abrir coverage/ui-consulta/index.html, coverage/ui-autoria/index.html
# o coverage/ui-compartida/index.html
```

Las pruebas de punta a punto requieren el backend con el seed de demo activo.
Las pruebas unitarias no necesitan backend.

## Documentación

La API de cada proyecto (componentes, servicios, modelos y rutas) se genera con
[Compodoc](https://compodoc.app), que además publica como **Guías** los
markdown de `projects/<proyecto>/docs/` (descritos en su `summary.json`).

```bash
npm run docs              # genera los tres sitios en docs/<proyecto>/
npm run docs:consulta     # solo ui-consulta
npm run docs:autoria      # solo ui-autoria
npm run docs:compartida   # solo ui-compartida
```

**Acceso:** abre en el navegador

- `docs/ui-consulta/index.html`
- `docs/ui-autoria/index.html`
- `docs/ui-compartida/index.html`

o previsualiza con recarga en vivo:

```bash
npm run docs:serve:consulta   # http://localhost:8091
npm run docs:serve:autoria    # http://localhost:8092
npm run docs:serve:compartida # http://localhost:8090
```

La salida HTML de `docs/` no se versiona (está en `.gitignore`); las guías
markdown y los `tsconfig.doc.json` sí. Compodoc también escribe un `llms.txt`
por sitio, pensado para alimentar asistentes. Las descripciones salen de los
comentarios TSDoc/JSDoc del código.

## Convenciones

- Componentes **standalone**; selectores `app-*`.
- Tokens de diseño en `projects/ui-compartida/src/styles/_tokens.scss`
  (paleta OKLCH, mobile-first, `max-width: 480px`).
- Formato con Prettier (100 columnas, comillas simples).
