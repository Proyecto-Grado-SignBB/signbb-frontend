import { Nodo } from './nodo.model';

export type EstadoRecorrido = 'EN_CURSO' | 'FINALIZADO';
export type ResultadoFinal = 'NORMAL' | 'REQUIERE_ATENCION';

export interface RecorridoResponse {
  recorridoId: string;
  estado: EstadoRecorrido;
  nodoActual: Nodo | null;
  resultado: ResultadoFinal | null;
  mensaje: string | null;
}

export interface IniciarRecorridoRequest {
  grafoClinicoId: string;
}

export interface ResponderRequest {
  respuesta: string;
}