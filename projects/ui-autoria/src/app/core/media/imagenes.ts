import { environment } from '../../../environments/environment';

/** Máximo de imágenes de apoyo por pregunta. */
export const MAX_IMAGENES = 3;

/** Peso máximo de cada imagen (1 MB). */
export const MAX_BYTES_IMAGEN = 1024 * 1024;

/** Formatos que acepta el servidor. */
export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Dirección para mostrar una imagen guardada (`/media` está en la raíz del servidor, no en `/api`). */
export function urlImagen(nombre: string): string {
  return `${environment.apiUrl.replace(/\/api\/?$/, '')}/media/${nombre}`;
}

/**
 * Por qué no se puede subir este archivo, en lenguaje humano, o `null` si se
 * puede. El servidor vuelve a revisar todo; esto solo evita el viaje.
 */
export function errorDeArchivo(archivo: { type: string; size: number }, yaSubidas: number): string | null {
  if (yaSubidas >= MAX_IMAGENES) {
    return `Una pregunta puede tener hasta ${MAX_IMAGENES} imágenes.`;
  }
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return 'Solo se aceptan imágenes png, jpeg, webp o gif.';
  }
  if (archivo.size > MAX_BYTES_IMAGEN) {
    const mb = (archivo.size / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `La imagen pesa ${mb} MB y el máximo es 1 MB. Elige una más liviana.`;
  }
  return null;
}
