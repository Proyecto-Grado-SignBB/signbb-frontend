# Guía de `ui-compartida`

Librería de componentes y tipos reutilizados por las aplicaciones `ui-consulta`
y `ui-autoria`. Se compila antes que las apps (`npx ng build ui-compartida`) y
las apps la consumen desde `dist/ui-compartida`.

## Contenido

- **Componentes de UI** (`src/lib/ui/`): `boton`, `etiqueta`, `insignia-icono`,
  `mensaje-error` y `aviso-legal`. Son standalone y usan los tokens de diseño.
- **Tipos compartidos** (`src/lib/tipos/`): contratos comunes entre apps.

## Cómo se documenta

Esta guía y cualquier otro `.md` de `projects/ui-compartida/docs/` aparecen en
la sección **Guías** del sitio de Compodoc. La portada es el `README.md` del
proyecto. Los componentes, servicios y tipos se documentan a partir de los
comentarios TSDoc/JSDoc del código.

Para regenerar el sitio:

```bash
npm run docs:compartida
```
