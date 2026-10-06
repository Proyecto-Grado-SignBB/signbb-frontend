import type { NivelAlerta, TipoInteraccion } from 'ui-compartida';

export type { NivelAlerta, TipoInteraccion };

export type EstadoRecorrido = 'EN_CURSO' | 'FINALIZADO';

export interface PreguntaDTO {
  id: string;
  texto: string;
  opciones: string[];
  tieneImagenes: boolean;
  imagenes: string[];
  tipoInteraccion?: TipoInteraccion;
}

export interface PasoCausalDTO {
  nodoId: string;
  condicion: string;
}

export interface RecomendacionDTO {
  nodoId: string;
  mensaje: string;
  caminoCausal: PasoCausalDTO[];
}

export interface ResultadoDTO {
  nivel: NivelAlerta;
  destinoId: string;
  mensaje: string;
  razones: string[];
  caminoCausal: PasoCausalDTO[];
  /** Todas las recomendaciones alcanzadas (cierre sin alerta); ausente en backends anteriores. */
  recomendaciones?: RecomendacionDTO[];
}

export interface RecorridoResponse {
  recorridoId: string;
  estado: EstadoRecorrido;
  pregunta: PreguntaDTO | null;
  resultado: ResultadoDTO | null;
}

export interface ResponderRequest {
  respuesta?: string;
  opciones?: string[];
  tipo?: TipoInteraccion;
}