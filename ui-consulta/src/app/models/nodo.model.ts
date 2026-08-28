export interface OpcionRespuesta {
  texto: string;
  valor: string;
}

export interface Nodo {
  id: string;
  texto: string;
  opciones: OpcionRespuesta[];
}