/**
 * Modelo local de nodo y opción de respuesta.
 *
 * <p>
 * No está referenciado por la navegación actual (que usa
 * `recorrido.model.ts`); se conserva como modelo auxiliar.
 */

/** Opción de respuesta de un nodo: texto visible y valor interno. */
export interface OpcionRespuesta {
  /** Texto que ve el cuidador. */
  texto: string;
  /** Valor interno de la opción. */
  valor: string;
}

/** Nodo del grafo con sus opciones de respuesta. */
export interface Nodo {
  /** Id numérico del nodo. */
  id: number;
  /** Texto de la pregunta o desenlace. */
  texto: string;
  /** Opciones de respuesta. */
  opciones: OpcionRespuesta[];
}