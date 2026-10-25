/** Texto legible de cada opción de respuesta; lo usan la pregunta y el resultado. */
export const ETIQUETAS_OPCION: Record<string, string> = {
  SI: 'Sí',
  NO: 'No',
  MENOS_DE_24_HORAS: 'Menos de 24 horas',
  MAS_DE_24_HORAS: 'Más de 24 horas',
  SOMNOLENCIA: 'Somnoliento o letárgico',
  SANGRE_EN_HECES: 'Sangre en las heces',
  NINGUNO: 'Ninguno de estos',
  COME_MENOS: 'Se alimenta menos de lo habitual',
  AMARILLO_SE_EXTIENDE: 'El amarillo se está extendiendo'
};

/** Texto legible de una opción; si no hay traducción, usa el valor crudo. */
export function etiquetaOpcion(valor: string): string {
  return ETIQUETAS_OPCION[valor] ?? valor;
}
