# Guía de `ui-consulta`

Aplicación de la **cuidadora**: recorre el grafo clínico respondiendo las
preguntas y muestra el desenlace del triaje.

## Arquitectura

- **Sin estado persistido en el cliente.** La identidad del recorrido es el
  parámetro de ruta `:recorridoId`; todo el estado se vuelve a pedir al backend
  a través de `core/http/recorrido.ts`. No hay librería de estado ni
  `localStorage`; los componentes usan *signals*.
- **Rutas** en `app.routes.ts`: inicio → pregunta → resultado. No hay ruta
  comodín ni 404.
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
