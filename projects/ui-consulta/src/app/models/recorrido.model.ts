import type { NivelAlerta, TipoInteraccion } from 'ui-compartida';

export type { NivelAlerta, TipoInteraccion };

/** Estado de la sesión: aún respondiendo preguntas o ya con desenlace. */
export type EstadoRecorrido = 'EN_CURSO' | 'FINALIZADO';

/** Pregunta que el recorrido presenta al cuidador mientras está en curso. */
export interface PreguntaDTO {
  /** Id del nodo pregunta. */
  id: string;
  /** Contenido de la pregunta. */
  texto: string;
  /** Etiquetas de las respuestas válidas. */
  opciones: string[];
  /** Si la pregunta tiene imágenes de apoyo. */
  tieneImagenes: boolean;
  /** Rutas de las imágenes; vacía si no tiene. */
  imagenes: string[];
  /** Tipo de interacción; si falta, se infiere de las opciones. */
  tipoInteraccion?: TipoInteraccion;
}

/** Un paso del camino causal hacia el desenlace. */
export interface PasoCausalDTO {
  /** Id del nodo alcanzado. */
  nodoId: string;
  /** Condición de la arista por la que se llegó; vacía en el nodo inicial. */
  condicion: string;
}

/** Una recomendación alcanzada durante el recorrido, con su propio camino causal. */
export interface RecomendacionDTO {
  /** Id del nodo de recomendación. */
  nodoId: string;
  /** Contenido de la recomendación. */
  mensaje: string;
  /** Camino de preguntas y respuestas que llevó a ella. */
  caminoCausal: PasoCausalDTO[];
}

/** Desenlace de un recorrido finalizado. */
export interface ResultadoDTO {
  /** Nivel de alerta resultante. */
  nivel: NivelAlerta;
  /** Id del nodo terminal. */
  destinoId: string;
  /** Contenido del nodo terminal. */
  mensaje: string;
  /** Ids de las reglas que dispararon; vacío si NORMAL. */
  razones: string[];
  /** Secuencia de nodos y condiciones hasta el destino. */
  caminoCausal: PasoCausalDTO[];
  /** Todas las recomendaciones alcanzadas (cierre sin alerta); ausente en backends anteriores. */
  recomendaciones?: RecomendacionDTO[];
}

/**
 * Vista de un recorrido: si está en curso trae `pregunta` y `resultado` es nulo;
 * si finalizó, trae `resultado` y `pregunta` es nulo.
 */
export interface RecorridoResponse {
  /** Id de la sesión de recorrido. */
  recorridoId: string;
  /** Estado de la sesión. */
  estado: EstadoRecorrido;
  /** Pregunta actual, solo si el recorrido está en curso. */
  pregunta: PreguntaDTO | null;
  /** Desenlace, solo si el recorrido finalizó. */
  resultado: ResultadoDTO | null;
}

/** Cuerpo de la petición que responde la pregunta actual. */
export interface ResponderRequest {
  /** Opción seleccionada (formato de una sola opción). */
  respuesta?: string;
  /** Todas las opciones marcadas (selección múltiple). */
  opciones?: string[];
  /** Pista del tipo de interacción para la auditoría. */
  tipo?: TipoInteraccion;
}

/** Fila de «Mis recorridos»: un recorrido de esta cuenta, en curso o terminado. */
export interface ResumenRecorridoDTO {
  /** Id del recorrido. */
  recorridoId: string;
  /** En curso o terminado. */
  estado: EstadoRecorrido;
  /** Nivel de alerta del resultado; nulo si sigue en curso. */
  nivel: NivelAlerta | null;
  /** Mensaje de la conclusión; nulo si sigue en curso. */
  mensaje: string | null;
  /** Cuándo empezó. */
  iniciadoEn: string;
  /** Cuándo terminó; nulo si sigue en curso. */
  finalizadoEn: string | null;
}
