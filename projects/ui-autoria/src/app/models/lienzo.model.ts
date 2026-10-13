/**
 * Tipos del contrato de `/api/autoria` (rama `autoria` del backend): el
 * médico arma un subgrafo en el lienzo, con un "+" en cada respuesta que
 * todavía no dice qué pasa después.
 */

/** Semáforo de una respuesta: verde, amarillo o rojo. */
export type Gravedad = 'LEVE' | 'MODERADA' | 'GRAVE';

/** Clase de nodo del lienzo: pregunta o conclusión. */
export type TipoNodo = 'PREGUNTA' | 'CONCLUSION';

/** Desenlace de una conclusión. */
export type Desenlace = 'RECOMENDACION' | 'CONSULTA_MEDICA' | 'URGENCIA';

/** Estado de un borrador respecto a lo que ve la cuidadora. */
export type EstadoBorrador = 'BORRADOR' | 'PUBLICADO' | 'CAMBIOS_SIN_PUBLICAR';

/** Clases de aviso del lienzo (todas bloquean la publicación salvo `NODO_SUELTO`). */
export type CodigoAviso =
  | 'SIN_INICIO'
  | 'TEXTO_VACIO'
  | 'POCAS_RESPUESTAS'
  | 'RESPUESTA_REPETIDA'
  | 'RESPUESTA_SIN_CAMINO'
  | 'SIN_DESENLACE'
  | 'CICLO'
  | 'NODO_SUELTO'
  | 'REGLA_SIN_NOMBRE'
  | 'REGLA_SIN_CONDICIONES'
  | 'REGLA_SIN_DESTINO'
  | 'REGLA_NIVEL_NORMAL'
  | 'REGLA_CONDICION_INVALIDA'
  | 'REGLA_DESTINO_INEXISTENTE';

/** Una respuesta de una pregunta; `destino` nulo es un "+" pendiente. */
export interface RespuestaLienzo {
  id: string;
  texto: string;
  gravedad: Gravedad;
  destino: string | null;
}

/** Nodo del lienzo: una pregunta con sus respuestas o una conclusión. */
export interface NodoLienzo {
  id: string;
  tipo: TipoNodo;
  /** Enunciado de la pregunta, o mensaje para la cuidadora si es conclusión. */
  texto: string;
  /** Si la cuidadora puede marcar varias respuestas (solo preguntas). */
  variasRespuestas: boolean;
  /** Desenlace (solo conclusiones). */
  desenlace: Desenlace | null;
  /** Respuestas de la pregunta (vacía en una conclusión). */
  respuestas: RespuestaLienzo[];
  /** Nombres de las imágenes de apoyo de la pregunta (máximo 3), en orden. */
  imagenes?: string[];
}

/** Aviso del lienzo, en lenguaje humano. Los bloqueantes impiden publicar. */
export interface Aviso {
  codigo: CodigoAviso;
  bloqueante: boolean;
  mensaje: string;
  nodoId: string | null;
  respuestaId: string | null;
}

/** Pregunta puente del grafo raíz donde se ofrece un subgrafo. */
export interface Categoria {
  puenteId: string;
  nombre: string;
  pregunta: string;
}

/** Fila del tablero de subgrafos. */
export interface ResumenSubgrafoDTO {
  id: number;
  grafoId: string;
  nombre: string;
  categoria: string;
  etiquetaOpcion: string;
  autor: string | null;
  estado: EstadoBorrador;
  nodos: number;
  actualizadoEn: string;
  publicadoEn: string | null;
}

/** Borrador completo; lo devuelven todas las operaciones que editan. */
export interface SubgrafoDTO {
  id: number;
  grafoId: string;
  nombre: string;
  puenteId: string;
  categoria: string;
  etiquetaOpcion: string;
  autor: string | null;
  institucion: string | null;
  estado: EstadoBorrador;
  inicio: string | null;
  nodos: NodoLienzo[];
  avisos: Aviso[];
  creadoEn: string;
  actualizadoEn: string;
  publicadoEn: string | null;
  /** Hay una copia de lo publicado a la que se puede volver con «Descartar cambios». */
  puedeDescartar: boolean;
}

/** Cuerpo de los 422 de autoría. */
export interface ErrorAutoriaDTO {
  mensaje: string;
  avisos: Aviso[];
}

/** Datos de un subgrafo, para crearlo o cambiar sus datos. */
export interface SubgrafoRequest {
  /** Nombre técnico: solo lo ven los médicos. */
  nombre: string;
  puenteId: string;
  /** Nombre para la familia (obligatorio): la opción que verá la cuidadora. */
  etiquetaOpcion: string;
  autor?: string;
  institucion?: string;
}

export interface OpcionRequest {
  /** Solo al editar una respuesta existente, para conservar su destino. */
  id?: string | null;
  texto: string;
  gravedad: Gravedad;
}

/** La acción del "+" (con `despuesDe`) o la edición de un nodo (sin él). */
export interface NodoRequest {
  /** Respuesta cuyo "+" se tocó; `null` para la primera pregunta. */
  despuesDe?: { nodoId: string; respuestaId: string } | null;
  tipo?: TipoNodo;
  texto: string;
  variasRespuestas?: boolean;
  desenlace?: Desenlace | null;
  respuestas?: OpcionRequest[];
  /** Nombres devueltos al subir cada imagen (solo preguntas). Omitido, al editar se conservan las actuales. */
  imagenes?: string[];
}

/** Texto legible de cada gravedad. */
export const ETIQUETA_GRAVEDAD: Record<Gravedad, string> = {
  LEVE: 'Leve',
  MODERADA: 'Moderada',
  GRAVE: 'Grave'
};

/** Texto legible de cada desenlace. */
export const ETIQUETA_DESENLACE: Record<Desenlace, string> = {
  RECOMENDACION: 'Recomendación',
  CONSULTA_MEDICA: 'Consultar al médico',
  URGENCIA: 'Ir a urgencias'
};

/** Texto legible de cada estado del borrador. */
export const ETIQUETA_ESTADO: Record<EstadoBorrador, string> = {
  BORRADOR: 'Borrador',
  PUBLICADO: 'Publicado',
  CAMBIOS_SIN_PUBLICAR: 'Cambios sin publicar'
};

/** Nombre legible de una categoría ("neurologico" → "Neurológico"). */
export function nombreCategoria(categoria: string): string {
  const conTilde: Record<string, string> = {
    respiracion: 'Respiración',
    neurologico: 'Neurológico',
    gastrointestinal: 'Gastrointestinal'
  };
  return conTilde[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

/** Explicación para el médico del campo «Nombre para la familia». */
export const AYUDA_NOMBRE_FAMILIA =
  'Así verán este signo los papás, mamás y cuidadores cuando lo elijan. Escríbelo sin términos médicos, '
  + 'como lo describiría una familia: por ejemplo «Piel u ojos amarillos» en lugar de «Ictericia».';
