# Guía de `ui-compartida`

Librería de componentes y tipos reutilizados por las aplicaciones `ui-consulta`
y `ui-autoria`. Se compila antes que las apps (`npx ng build ui-compartida`) y
las apps la consumen desde `dist/ui-compartida`.

## Contenido

- **Componentes de UI** (`src/lib/ui/`): `boton`, `etiqueta`, `insignia-icono`,
  `mensaje-error` y `aviso-legal`. Son standalone y usan los tokens de diseño.
- **Tipos compartidos** (`src/lib/tipos/`): contratos comunes entre apps.
- **Sesión** (`src/lib/sesion/`): `SesionService`, `interceptorSesion` y
  `guardSesion`. Ver la sección siguiente.

## Sesión

Las dos apps ingresan contra `POST /api/auth/login` (y `ui-consulta` registra
padres con `POST /api/auth/registro`). El back devuelve un JWT que va en
`Authorization: Bearer`.

Cada app provee dos tokens en su `app.config.ts`:

```ts
provideHttpClient(withInterceptors([interceptorSesion])),
{ provide: API_URL, useValue: environment.apiUrl },
{ provide: CLAVE_SESION, useValue: 'signbb.autoria.sesion' }
```

- `API_URL`: el token solo se agrega a las peticiones que empiezan por ella.
- `CLAVE_SESION`: la clave de `localStorage` donde se guarda la sesión. Cada
  app usa la suya, así que ingresar en una no abre la otra.

| Pieza | Qué hace |
|---|---|
| `SesionService` | `usuario()`, `token()`, `autenticado()`, `tieneRol(...)`, `vigente()`, `ingresar`, `registrar`, `salir`. Descarta al arrancar una sesión vencida o dañada. |
| `interceptorSesion` | Pone el Bearer solo hacia `API_URL`. Un 401 (que no sea del ingreso o el registro) cierra la sesión y lleva a `/ingresar?volver=<ruta>`. Un 403 no cierra la sesión. |
| `guardSesion(...roles)` | Sin sesión vigente, lleva a `/ingresar?volver=<ruta>`; con otro rol, a `/ingresar?motivo=rol`. |

Cada app tiene su propia ruta `/ingresar`.

## Cómo se documenta

Esta guía y cualquier otro `.md` de `projects/ui-compartida/docs/` aparecen en
la sección **Guías** del sitio de Compodoc. La portada es el `README.md` del
proyecto. Los componentes, servicios y tipos se documentan a partir de los
comentarios TSDoc/JSDoc del código.

Para regenerar el sitio:

```bash
npm run docs:compartida
```
