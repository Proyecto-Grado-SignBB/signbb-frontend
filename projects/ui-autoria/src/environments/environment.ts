export const environment = {
  production: true,
  // Ruta relativa: Caddy sirve la aplicación y hace proxy de /api y /media
  // al backend, de modo que el mismo build funciona con cualquier dominio.
  apiUrl: '/api'
};
