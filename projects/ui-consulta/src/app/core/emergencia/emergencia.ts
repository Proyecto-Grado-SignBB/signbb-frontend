/** Línea única de emergencias de Colombia. */
export const LINEA_EMERGENCIA = '123';

/** Enlace `tel:` de un número, sin los espacios con que se escribió. */
export function enlaceTelefono(numero: string): string {
  return `tel:${numero.replace(/\s+/g, '')}`;
}
