# Guía de `ui-autoria`

Aplicación del **médico**: arma subgrafos clínicos en un lienzo, ve los avisos y
los envía a revisión. Cuando un supervisor los aprueba, se publican y la
cuidadora los puede recorrer.

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
- **Revisión**: en el lienzo, «Enviar a revisión» (`modal-publicar`, con los
  mismos avisos bloqueantes) manda el subgrafo y su base de reglas al
  supervisor. Se puede enviar si no está publicado, o si lo está pero sus
  reglas tienen cambios sin publicar. En `EN_REVISION` el lienzo y el editor de
  reglas quedan en solo lectura y aparece «Retirar de revisión». Si el
  supervisor lo rechazó, arriba sale su comentario. El médico ya no publica ni
  despublica: aprobar, rechazar y despublicar son del supervisor y por ahora no
  tienen pantallas (se hacen por la API).
- **Vista del supervisor**: el back le lista al supervisor los subgrafos y las
  bases de todos. Los tableros los separan con `esAjeno` (`core/sesion/`): los
  propios arriba y, aparte, «De otros médicos» con «Por {autor}» (los que están
  en revisión primero) y sin «Eliminar». El lienzo muestra siempre «Creado por
  {autor} · {institución}»; si es de otro, `soloLectura` oculta los botones de
  edición y los "+", y el editor de reglas deja recorrer las reglas pero no
  tocarlas. Solo el autor edita, igual que en el back
  (`PoliticaAccesoBorradores`).
- **API base** en `src/environments/environment*.ts`.

## Cómo se documenta

Esta guía y cualquier otro `.md` de `projects/ui-autoria/docs/` aparecen en la
sección **Guías** del sitio de Compodoc. La portada es el `README.md`. Los
componentes, servicios, modelos y el grafo de rutas se generan del código.

Para regenerar el sitio:

```bash
npm run docs:autoria
```
