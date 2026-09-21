export type EstadoRecorrido = 'EN_CURSO' | 'FINALIZADO';
export type NivelAlerta = 'NORMAL' | 'CONSULTAR_MEDICO' | 'URGENCIA';
export type TipoInteraccion = 'SI_NO' | 'SELECCION_UNICA' | 'SELECCION_MULTIPLE';

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

export interface ResultadoDTO {
  nivel: NivelAlerta;
  destinoId: string;
  mensaje: string;
  razones: string[];
  caminoCausal: PasoCausalDTO[];
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