import type { NivelAlerta } from 'ui-compartida';
import type { Aviso, Desenlace, EstadoBorrador } from './lienzo.model';

/**
 * Tipos del contrato de reglas de `/api/autoria/bases`: una base de reglas
 * pertenece a un grafo (un subgrafo) y agrupa las reglas que lo redirigen.
 */

/** Condición de una regla: la respuesta que se espera en un nodo. */
export interface Condicion {
  /** Id del nodo pregunta (local al subgrafo). */
  idNodo: string;
  /** Respuesta que debe estar marcada. */
  respuesta: string;
}

/** Regla de una base de reglas. */
export interface ReglaDTO {
  /** Id de la regla (`R_1`, `R_2`…). */
  id: string;
  /** Nombre de la regla. */
  nombre: string;
  /** Explicación para el médico. */
  descripcion: string | null;
  /** FND: lista de casos (OR), cada caso una lista de condiciones (AND). */
  casos: Condicion[][];
  /** Nivel de alerta al dispararse. */
  nivel: NivelAlerta;
  /** Id del nodo destino (una conclusión del subgrafo). */
  nodoDestino: string;
}

/** Regla para crear o editar. */
export interface ReglaRequest {
  nombre: string;
  descripcion?: string;
  casos: Condicion[][];
  nivel: NivelAlerta;
  nodoDestino: string;
}

/** Borrador completo de una base de reglas. */
export interface BaseReglaDTO {
  id: number;
  grafoId: string;
  nombre: string;
  descripcion: string | null;
  autor: string | null;
  institucion: string | null;
  estado: EstadoBorrador;
  reglas: ReglaDTO[];
  avisos: Aviso[];
  creadoEn: string;
  actualizadoEn: string;
  publicadoEn: string | null;
  /** Hay una copia de lo publicado a la que se puede volver con «Descartar cambios». */
  puedeDescartar: boolean;
}

/** Datos de una base de reglas para crearla o editar sus datos. */
export interface BaseReglaRequest {
  nombre: string;
  descripcion?: string;
  /** Grafo (subgrafo) al que pertenecen las reglas; se fija al crear. */
  grafoId: string;
  autor?: string;
  institucion?: string;
}

/** Fila del tablero de bases de reglas. */
export interface ResumenBaseReglaDTO {
  id: number;
  grafoId: string;
  nombre: string;
  descripcion: string | null;
  autor: string | null;
  estado: EstadoBorrador;
  /** Número de reglas. */
  reglas: number;
  actualizadoEn: string;
  publicadoEn: string | null;
}

/** Nodo del catálogo con sus respuestas. */
export interface NodoCatalogoDTO {
  id: string;
  texto: string;
  tipo: 'pregunta' | 'terminal';
  /** Respuestas válidas; vacía en un terminal. */
  opciones: string[];
  /** Desenlace del terminal; `null` en las preguntas. */
  desenlace: Desenlace | null;
}

/** Catálogo de nodos y respuestas de un grafo. */
export interface CatalogoDTO {
  grafoId: string;
  nodos: NodoCatalogoDTO[];
}

/** Texto legible de cada nivel de alerta. */
export const ETIQUETA_NIVEL: Record<NivelAlerta, string> = {
  NORMAL: 'Normal',
  CONSULTAR_MEDICO: 'Consultar médico',
  URGENCIA: 'Urgencia'
};

/** Preguntas del catálogo (nodos que admiten respuestas). */
export function preguntasDe(catalogo: CatalogoDTO | null): NodoCatalogoDTO[] {
  return (catalogo?.nodos ?? []).filter(n => n.tipo === 'pregunta');
}

/** Conclusiones del catálogo (posibles destinos de una regla). */
export function terminalesDe(catalogo: CatalogoDTO | null): NodoCatalogoDTO[] {
  return (catalogo?.nodos ?? []).filter(n => n.tipo === 'terminal');
}

/** Texto de un nodo del catálogo por id, o el id si no está. */
export function textoDeNodo(catalogo: CatalogoDTO | null, id: string | null): string {
  if (!id) {
    return '';
  }
  return catalogo?.nodos.find(n => n.id === id)?.texto ?? id;
}

/** Opciones (respuestas) de un nodo pregunta del catálogo. */
export function opcionesDeNodo(catalogo: CatalogoDTO | null, idNodo: string | null): string[] {
  if (!idNodo) {
    return [];
  }
  return catalogo?.nodos.find(n => n.id === idNodo)?.opciones ?? [];
}

/** Desenlace de un nodo del catálogo por id, o `null` si no está o es una pregunta. */
export function desenlaceDeNodo(catalogo: CatalogoDTO | null, idNodo: string | null): Desenlace | null {
  if (!idNodo) {
    return null;
  }
  return catalogo?.nodos.find(n => n.id === idNodo)?.desenlace ?? null;
}
