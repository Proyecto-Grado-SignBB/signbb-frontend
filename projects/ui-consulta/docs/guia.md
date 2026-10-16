# Guía de `ui-consulta`

Aplicación de la **cuidadora**: recorre el grafo clínico respondiendo las
preguntas y muestra el desenlace del triaje.

## Arquitectura

- **Cuenta obligatoria.** La familia se registra o ingresa (`features/cuenta`)
  y el recorrido queda a su nombre. La sesión (`SesionService` de
  `ui-compartida`) se guarda en `localStorage` con la clave
  `signbb.consulta.sesion`, distinta de la de autoría, y el interceptor pone el
  token en cada petición al back. Una cuenta de médico se rechaza con un aviso.
- **Sin más estado en el cliente.** La identidad del recorrido es el parámetro
  de ruta `:recorridoId`; todo el estado se vuelve a pedir al backend a través
  de `core/http/recorrido.ts`. Los componentes usan *signals*.
- **Rutas** en `app.routes.ts`: `bienvenida` (explica la herramienta y lleva a
  crear la cuenta o ingresar), `ingresar` y `registro` son públicas. El inicio
  (`guardFamilia`) sin sesión lleva a la bienvenida; pregunta, resultado,
  `mis-recorridos` y `perfil` (donde se cierra la sesión) piden una cuenta
  `PADRE`. Si el back
  responde 404 a un recorrido (es de otra cuenta o venció), se vuelve al inicio
  con «Ese recorrido no está disponible.». No hay ruta comodín ni 404.
- **Modelos** en `app/models/` (`recorrido.model.ts`, `nodo.model.ts`).
- **API base** en `src/environments/environment*.ts`.

## Cómo se documenta

Esta guía y cualquier otro `.md` de `projects/ui-consulta/docs/` aparecen en la
sección **Guías** del sitio de Compodoc. La portada es el `README.md`. Los
componentes, servicios, modelos y el grafo de rutas se generan del código.

Para regenerar el sitio:

```bash
npm run docs:consulta
```
