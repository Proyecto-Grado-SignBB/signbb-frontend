import type { Desenlace } from '../../../../models/lienzo.model';
import { CatalogoDTO, Condicion, desenlaceDeNodo, textoDeNodo } from '../../../../models/regla.model';

/** Medidas del visor, en píxeles. */
export const MEDIDAS_REGLA = {
  anchoNodo: 230,
  altoNodo: 84,
  /** Separación mínima entre el borde izquierdo de dos columnas. */
  columna: 400,
  margen: 24,
  /** Distancia vertical entre etiquetas apiladas en la misma rama. */
  separacionEtiquetas: 24
};

/** Ancho aproximado de una etiqueta de respuesta (fuente de 11.5 px, una línea). */
function anchoEtiqueta(texto: string): number {
  return Math.round(texto.length * 6.6) + 28;
}

/** Un nodo ubicado en el visor: una pregunta implicada o la conclusión destino. */
export interface PasoRegla {
  id: string;
  texto: string;
  tipo: 'pregunta' | 'terminal';
  /** Desenlace del terminal (`RECOMENDACION`, `CONSULTA_MEDICA`, `URGENCIA`), o `null`. */
  desenlace: Desenlace | null;
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
 * <p>La separación entre columnas es dinámica: cada hueco crece lo necesario
 * para que la etiqueta de respuesta más larga quepa sin recortarse.
 *
 * Es una función pura: no toca el DOM.
 */
export function distribuirCaso(caso: Condicion[], catalogo: CatalogoDTO | null,
  nodoDestino: string): CasoVista {
  const condiciones = caso.filter(c => c.idNodo !== '' && c.respuesta !== '');
  const anchoMinimo = MEDIDAS_REGLA.anchoNodo + MEDIDAS_REGLA.margen * 2;
  if (condiciones.length === 0) {
    return {
      pasos: [], enlaces: [], ancho: anchoMinimo,
      alto: MEDIDAS_REGLA.altoNodo + MEDIDAS_REGLA.margen * 2, vacio: true
    };
  }

  const preguntas = distinct(condiciones.map(c => c.idNodo));
  const totalColumnas = preguntas.length + (nodoDestino ? 1 : 0);

  // Destino (índice de columna) de cada condición y etiquetas que van en cada hueco.
  const destinoDe = condiciones.map(c => {
    const origen = preguntas.indexOf(c.idNodo);
    return origen < preguntas.length - 1 ? origen + 1 : preguntas.length;
  });
  const etiquetasPorHueco: string[][] =
    Array.from({ length: Math.max(totalColumnas - 1, 0) }, () => []);
  condiciones.forEach((cond, idx) => {
    const origen = preguntas.indexOf(cond.idNodo);
    if (destinoDe[idx] < totalColumnas && origen < etiquetasPorHueco.length) {
      etiquetasPorHueco[origen].push(cond.respuesta);
    }
  });

  const huecoMinimo = MEDIDAS_REGLA.columna - MEDIDAS_REGLA.anchoNodo;
  const huecos = etiquetasPorHueco.map(ls =>
    Math.max(huecoMinimo, ...ls.map(anchoEtiqueta), 0));
  const x: number[] = [MEDIDAS_REGLA.margen];
  for (let i = 0; i < huecos.length; i++) {
    x.push(x[i] + MEDIDAS_REGLA.anchoNodo + huecos[i]);
  }

  const pasos: PasoRegla[] = preguntas.map((id, i) => ({
    id,
    texto: textoDeNodo(catalogo, id),
    tipo: 'pregunta',
    desenlace: null,
    x: x[i],
    y: MEDIDAS_REGLA.margen
  }));
  if (nodoDestino) {
    pasos.push({
      id: nodoDestino,
      texto: textoDeNodo(catalogo, nodoDestino),
      tipo: 'terminal',
      desenlace: desenlaceDeNodo(catalogo, nodoDestino),
      x: x[preguntas.length],
      y: MEDIDAS_REGLA.margen
    });
  }

  const totalDestinos = pasos.length;
  const porOrigen = new Map<number, number>();
  const enlaces: EnlaceRegla[] = [];
  condiciones.forEach((cond, idx) => {
    const origen = preguntas.indexOf(cond.idNodo);
    const destino = destinoDe[idx];
    if (destino >= totalDestinos || origen >= x.length) {
      return;
    }
    const ocurrencia = porOrigen.get(origen) ?? 0;
    porOrigen.set(origen, ocurrencia + 1);
    const x1 = x[origen] + MEDIDAS_REGLA.anchoNodo;
    const x2 = x[destino];
    const centroY = MEDIDAS_REGLA.margen + MEDIDAS_REGLA.altoNodo / 2;
    const y = centroY + ocurrencia * MEDIDAS_REGLA.separacionEtiquetas;
    enlaces.push({
      d: `M ${x1} ${y} H ${x2}`,
      etiqueta: cond.respuesta,
      etiquetaX: (x1 + x2) / 2,
      etiquetaY: y
    });
  });

  const maxOcurrencias = Math.max(1, ...porOrigen.values());
  const anchoFinal = x[Math.max(totalColumnas - 1, 0)] + MEDIDAS_REGLA.anchoNodo + MEDIDAS_REGLA.margen;
  const altoFinal = MEDIDAS_REGLA.altoNodo + MEDIDAS_REGLA.margen * 2
    + (maxOcurrencias - 1) * MEDIDAS_REGLA.separacionEtiquetas;
  return { pasos, enlaces, ancho: anchoFinal, alto: altoFinal, vacio: false };
}

/** Distribuye todos los casos de una regla. */
export function distribuirCasos(casos: Condicion[][], catalogo: CatalogoDTO | null,
  nodoDestino: string): CasoVista[] {
  return casos.map(caso => distribuirCaso(caso, catalogo, nodoDestino));
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
