export const environment = {
  production: true,
  // Ruta relativa: Caddy sirve la PWA y hace proxy de /api y /media al
  // backend, de modo que el mismo build funciona con cualquier dominio o IP.
  apiUrl: '/api'
};
