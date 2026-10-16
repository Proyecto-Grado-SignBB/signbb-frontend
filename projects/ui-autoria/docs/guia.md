# Guía de `ui-autoria`

Aplicación del **médico**: arma subgrafos clínicos en un lienzo, ve los avisos y
los publica para que la cuidadora los pueda recorrer.

## Arquitectura

- **Tablero y lienzo** en `features/subgrafos/`: `tablero` lista los subgrafos y
  crea uno nuevo; `lienzo` dibuja el árbol y ofrece el "+" en cada respuesta sin
  camino; `panel-nodo` crea o edita preguntas y conclusiones; `avisos` muestra
  los avisos del lienzo.
- **Cliente de la API** en `core/http/autoria.ts`; modelos en
  `models/lienzo.model.ts`.
- **Diálogos y errores** en `core/ui/` (`dialogo-confirmar`, `modal-datos`,
  `modal-publicar`).
- **Ingreso y sesión** en `features/ingreso/` y `core/sesion/`: el médico
  ingresa con correo y contraseña (no hay registro: las cuentas las crea un
  supervisor). Todas las rutas menos `/ingresar` piden sesión de `MEDICO` o
  `MEDICO_SUPERVISOR`; la sesión se guarda en `localStorage`
  (`signbb.autoria.sesion`). El servicio, el interceptor y el guard vienen de
  `ui-compartida`.
- **Autor**: el back lo toma de la sesión. El tablero, el perfil y la barra
  lateral muestran los datos de la cuenta; el front ya no manda `autor` ni
  `institucion`.
- **API base** en `src/environments/environment*.ts`.

## Cómo se documenta

Esta guía y cualquier otro `.md` de `projects/ui-autoria/docs/` aparecen en la
sección **Guías** del sitio de Compodoc. La portada es el `README.md`. Los
componentes, servicios, modelos y el grafo de rutas se generan del código.

Para regenerar el sitio:

```bash
npm run docs:autoria
```
