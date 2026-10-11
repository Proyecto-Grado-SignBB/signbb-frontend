import { CatalogoDTO, Condicion, textoDeNodo } from '../../../../models/regla.model';

/** Medidas del visor, en píxeles. */
export const MEDIDAS_REGLA = {
  anchoNodo: 230,
  altoNodo: 84,
  columna: 400,
  margen: 24,
  separacionEtiquetas: 24
};

/** Un nodo ubicado en el visor: una pregunta implicada o la conclusión destino. */
export interface PasoRegla {
  id: string;
  texto: string;
  tipo: 'pregunta' | 'terminal';
  x: number;
  y: number;
}

/** Una respuesta que debe estar marcada, dibujada como línea con su etiqueta. */
export interface EnlaceRegla {
  /** Atributo `d` del `<path>`: salida del origen → entrada al destino. */
  d: string;
  etiqueta: string;
  etiquetaX: number;
  etiquetaY: number;
}

/** Vista de un caso: sus pasos, sus enlaces y el tamaño del lienzo. */
export interface CasoVista {
  pasos: PasoRegla[];
  enlaces: EnlaceRegla[];
  ancho: number;
  alto: number;
  /** True si el caso todavía no tiene condiciones. */
  vacio: boolean;
}

/**
 * Ubica un caso como una cadena horizontal: las preguntas implicadas en orden
 * de aparición y, al final, la conclusión destino. Cada condición es una línea
 * con la respuesta que debe estar marcada.
 *
 * Es una función pura: no toca el DOM.
 */
export function distribuirCaso(caso: Condicion[], catalogo: CatalogoDTO | null,
  nodoDestino: string): CasoVista {
  const condiciones = caso.filter(c => c.idNodo !== '' && c.respuesta !== '');
  const ancho = MEDIDAS_REGLA.anchoNodo + MEDIDAS_REGLA.margen * 2;
  if (condiciones.length === 0) {
    return { pasos: [], enlaces: [], ancho, alto: MEDIDAS_REGLA.altoNodo + MEDIDAS_REGLA.margen * 2, vacio: true };
  }

  const preguntas = distinct(condiciones.map(c => c.idNodo));
  const pasos: PasoRegla[] = preguntas.map((id, i) => ({
    id,
    texto: textoDeNodo(catalogo, id),
    tipo: 'pregunta',
    x: xDe(i),
    y: MEDIDAS_REGLA.margen
  }));
  if (nodoDestino) {
    pasos.push({
      id: nodoDestino,
      texto: textoDeNodo(catalogo, nodoDestino),
      tipo: 'terminal',
      x: xDe(preguntas.length),
      y: MEDIDAS_REGLA.margen
    });
  }

  const totalDestinos = pasos.length;
  const porOrigen = new Map<number, number>();
  const enlaces: EnlaceRegla[] = [];
  for (const cond of condiciones) {
    const origen = preguntas.indexOf(cond.idNodo);
    const destino = origen < preguntas.length - 1 ? origen + 1 : preguntas.length;
    if (destino >= totalDestinos) {
      continue;
    }
    const ocurrencia = porOrigen.get(origen) ?? 0;
    porOrigen.set(origen, ocurrencia + 1);
    const x1 = xDe(origen) + MEDIDAS_REGLA.anchoNodo;
    const x2 = xDe(destino);
    const centroY = MEDIDAS_REGLA.margen + MEDIDAS_REGLA.altoNodo / 2;
    const y = centroY + ocurrencia * MEDIDAS_REGLA.separacionEtiquetas;
    enlaces.push({
      d: `M ${x1} ${y} H ${x2}`,
      etiqueta: cond.respuesta,
      etiquetaX: (x1 + x2) / 2,
      etiquetaY: y
    });
  }

  const maxOcurrencias = Math.max(1, ...porOrigen.values());
  const anchoFinal = xDe(Math.max(totalDestinos - 1, 0)) + MEDIDAS_REGLA.anchoNodo + MEDIDAS_REGLA.margen;
  const altoFinal = MEDIDAS_REGLA.altoNodo + MEDIDAS_REGLA.margen * 2
    + (maxOcurrencias - 1) * MEDIDAS_REGLA.separacionEtiquetas;
  return { pasos, enlaces, ancho: anchoFinal, alto: altoFinal, vacio: false };
}

/** Distribuye todos los casos de una regla. */
export function distribuirCasos(casos: Condicion[][], catalogo: CatalogoDTO | null,
  nodoDestino: string): CasoVista[] {
  return casos.map(caso => distribuirCaso(caso, catalogo, nodoDestino));
}

/** Coordenada X (borde izquierdo) de una columna. */
function xDe(indice: number): number {
  return MEDIDAS_REGLA.margen + indice * MEDIDAS_REGLA.columna;
}

/** Valores únicos conservando el orden de aparición. */
function distinct(valores: string[]): string[] {
  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const valor of valores) {
    if (!vistos.has(valor)) {
      vistos.add(valor);
      unicos.push(valor);
    }
  }
  return unicos;
}
