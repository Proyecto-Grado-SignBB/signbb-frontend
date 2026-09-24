export interface OpcionRespuesta {
  texto: string;
  valor: string;
}

export interface Nodo {
  id: number;
  texto: string;
  opciones: OpcionRespuesta[];
}