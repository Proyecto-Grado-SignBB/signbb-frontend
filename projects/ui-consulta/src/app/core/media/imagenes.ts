import { environment } from '../../../environments/environment';

/**
 * Dirección para mostrar una imagen de una pregunta. El grafo guarda el
 * nombre del archivo ({@code uuid.png}) o, en los grafos de ejemplo, una ruta
 * como `/media/ictericia-piel.jpg`. Las imágenes las entrega el backend desde
 * `/media`, en la raíz del servidor (no bajo `/api`).
 */
export function urlImagen(src: string): string {
  if (/^https?:\/\//.test(src)) {
    return src;
  }
  const raiz = environment.apiUrl.replace(/\/api\/?$/, '');
  return src.startsWith('/') ? `${raiz}${src}` : `${raiz}/media/${src}`;
}
