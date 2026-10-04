import type { NivelAlerta } from 'ui-compartida';

// ---------------------------------------------------------------------------
// Documento de autoría: { graph, rules }, tal como lo persiste el backend
// (GrafoAutoriaEntity.borradorJson / publicadoJson) y lo consumen
// GrafoClinicoParser / BaseReglasParser. Ver ControladorAutoria (rama
// feature/modulo-autoria).
// ---------------------------------------------------------------------------

export interface NodoMetadataJson {
  tipo: string;
  peso: number;
  archivos?: boolean;
  src?: string[];
  tipoInteraccion?: 'SI_NO' | 'SELECCION_UNICA' | 'SELECCION_MULTIPLE';
}

export interface NodoJson {
  label: string;
  metadata: NodoMetadataJson;
}

export interface AristaJson {
  source: string;
  relation: string;
  target: string;
}

export interface GraphJson {
  nodes: Record<string, NodoJson>;
  edges: AristaJson[];
  metadata?: Record<string, unknown>;
}

/**
 * Árbol lógico de condiciones de una regla, tal como lo evalúa el motor
 * (BaseReglasParser): una hoja {idNodo, respuesta}, o un nodo {and: [...]} /
 * {or: [...]} que combina sub-expresiones. Un arreglo plano en el documento
 * real es un Y (AND) implícito de hojas.
 */
export type CondicionJson =
  | { idNodo: string; respuesta: string }
  | { and: CondicionJson[] }
  | { or: CondicionJson[] };

export interface ReglaJson {
  nombre: string;
  condiciones: CondicionJson | CondicionJson[];
  nodoDestino: string;
  nivel: NivelAlerta;
}

export interface DocumentoAutoria {
  graph: GraphJson;
  rules: Record<string, ReglaJson>;
}

// ---------------------------------------------------------------------------
// DTOs de respuesta (org.signbb.backend.autoria.controladores)
// ---------------------------------------------------------------------------

export type EstadoGrafo = 'Borrador' | 'Publicado';

/** Fila del tablero (Pantalla 1). GET /api/autoria/grafos */
export interface GrafoResumenDTO {
  id: number;
  nombre: string;
  estado: EstadoGrafo;
  /** Instant serializado por Jackson como ISO-8601 string. */
  actualizadoEn: string;
  conteoPreguntas: number;
  conteoReglas: number;
}

/** Documento completo del borrador (Pantalla 2). GET /api/autoria/grafos/{id} */
export interface DocumentoDTO {
  id: number;
  nombre: string;
  documento: DocumentoAutoria;
}

/** Chequeos estructurales, informativos (no bloquean publicar). */
export interface ValidacionDTO {
  valido: boolean;
  nodosSueltos: string[];
  hayDeadEnds: boolean;
  hayCiclos: boolean;
  mensajes: string[];
}

/** Resultado de publicar: estado final + advertencias que no bloquearon. */
export interface PublicacionDTO {
  estado: EstadoGrafo;
  advertencias: string[];
}

/** Un error de validación de esquema, por campo del documento. */
export interface ErrorCampo {
  campo: string;
  detalle: string;
}

/** Cuerpo de la respuesta 422 cuando el documento no cumple el esquema. */
export interface ErrorValidacionDTO {
  mensaje: string;
  errores: ErrorCampo[];
}

/** Resultado de una edición granular (Pantallas 3-4): id afectado + documento resultante. */
export interface ResultadoEdicionDTO {
  id: string;
  documento: DocumentoDTO;
}

/** Una regla del listado (Pantalla 4). GET /api/autoria/grafos/{id}/reglas */
export interface ReglaDTO {
  id: string;
  nombre: string;
  condiciones: CondicionJson | CondicionJson[];
  nivel: NivelAlerta;
  nodoDestino: string;
}

/** Respuesta al subir una imagen. POST /api/autoria/media */
export interface MediaSubidaDTO {
  url: string;
}

// ---------------------------------------------------------------------------
// Cuerpos de petición
// ---------------------------------------------------------------------------

/** POST /api/autoria/grafos */
export interface CrearGrafoRequest {
  nombre: string;
  descripcion: string;
}

/** POST /api/autoria/grafos/{id}/guardar */
export interface DocumentoRequest {
  documento: DocumentoAutoria;
}

/** Una opción de respuesta de una pregunta: se traduce a una arista source→target. */
export interface OpcionRequest {
  etiqueta: string;
  destinoId: string;
}

/** POST|PUT /api/autoria/grafos/{id}/preguntas[/{nodoId}] */
export interface PreguntaRequest {
  texto: string;
  imagenes: string[];
  severidad: number;
  opciones: OpcionRequest[];
}

/** POST|PUT /api/autoria/grafos/{id}/reglas[/{reglaId}] */
export interface ReglaRequest {
  nombre: string;
  condiciones: CondicionJson | CondicionJson[];
  nivel: NivelAlerta;
  nodoDestinoId: string;
}
