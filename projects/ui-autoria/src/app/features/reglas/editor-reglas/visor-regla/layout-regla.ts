import type { Desenlace } from '../../../../models/lienzo.model';
import { CatalogoDTO, Condicion, desenlaceDeNodo, textoDeNodo } from '../../../../models/regla.model';

/** Medidas del visor, en píxeles. */
export const MEDIDAS_REGLA = {
  anchoNodo: 230,
  altoNodo: 84,
  /** Separación mínima entre el borde izquierdo de dos columnas. */
  columna: 400,
  margen: 24,
  /** Distancia vertical entre etiquetas apiladas en la misma arista. */
  separacionEtiquetas: 24
};

/** Holgura de la etiqueta de respuesta: padding (18) + borde (2) + aire a los lados. */
const HOLGURA_ETIQUETA = 32;

let contextoTexto: CanvasRenderingContext2D | null | undefined;

/** Ancho de una etiqueta de respuesta: medido con la fuente real, o estimado. */
function anchoEtiqueta(texto: string): number {
  const medido = medirTexto(texto);
  const base = medido ?? Math.round(texto.length * 7.2);
  return Math.ceil(base) + HOLGURA_ETIQUETA;
}

/** Mide el texto con la fuente de las etiquetas; `null` si no hay canvas (SSR). */
function medirTexto(texto: string): number | null {
  if (contextoTexto === undefined) {
    contextoTexto = typeof document === 'undefined'
      ? null
      : document.createElement('canvas').getContext('2d');
  }
  if (!contextoTexto) {
    return null;
  }
  contextoTexto.font = '800 11.5px "Public Sans", sans-serif';
  return contextoTexto.measureText(texto).width;
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

/** Una respuesta que debe estar marcada, con su posición en la arista. */
export interface EtiquetaRegla {
  texto: string;
  x: number;
  y: number;
}

/**
 * La arista de un tramo (pregunta → siguiente nodo). Es una sola línea aunque
 * el tramo requiera varias respuestas: se muestran apiladas y centradas.
 */
export interface EnlaceRegla {
  /** Atributo `d` del `<path>`: una sola línea horizontal para todo el tramo. */
  d: string;
  /** Respuestas que deben marcarse en este tramo, de arriba a abajo. */
  etiquetas: EtiquetaRegla[];
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
 * de aparición y, al final, la conclusión destino. Cada tramo es una sola
 * arista con las respuestas que deben marcarse, apiladas y centradas respecto
 * al nodo.
 *
 * <p>La separación entre columnas es dinámica: cada tramo crece lo necesario
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

  // Destino (índice de columna) de cada condición y respuestas que van en cada tramo.
  const destinoDe = condiciones.map(c => {
    const origen = preguntas.indexOf(c.idNodo);
    return origen < preguntas.length - 1 ? origen + 1 : preguntas.length;
  });
  const etiquetasPorTramo: string[][] =
    Array.from({ length: Math.max(totalColumnas - 1, 0) }, () => []);
  condiciones.forEach((cond, idx) => {
    const origen = preguntas.indexOf(cond.idNodo);
    if (destinoDe[idx] < totalColumnas && origen < etiquetasPorTramo.length) {
      etiquetasPorTramo[origen].push(cond.respuesta);
    }
  });

  const huecoMinimo = MEDIDAS_REGLA.columna - MEDIDAS_REGLA.anchoNodo;
  const huecos = etiquetasPorTramo.map(ls =>
    Math.max(huecoMinimo, ...ls.map(anchoEtiqueta), 0));
  const x: number[] = [MEDIDAS_REGLA.margen];
  for (let i = 0; i < huecos.length; i++) {
    x.push(x[i] + MEDIDAS_REGLA.anchoNodo + huecos[i]);
  }

  // Alto de la fila: lo que necesita la pila de etiquetas más alta (o el nodo).
  const maxEtiquetas = Math.max(1, ...etiquetasPorTramo.map(ls => ls.length));
  const altoFila = Math.max(MEDIDAS_REGLA.altoNodo, maxEtiquetas * MEDIDAS_REGLA.separacionEtiquetas);
  const centroFila = MEDIDAS_REGLA.margen + altoFila / 2;
  const nodoY = MEDIDAS_REGLA.margen + (altoFila - MEDIDAS_REGLA.altoNodo) / 2;

  const pasos: PasoRegla[] = preguntas.map((id, i) => ({
    id,
    texto: textoDeNodo(catalogo, id),
    tipo: 'pregunta',
    desenlace: null,
    x: x[i],
    y: nodoY
  }));
  if (nodoDestino) {
    pasos.push({
      id: nodoDestino,
      texto: textoDeNodo(catalogo, nodoDestino),
      tipo: 'terminal',
      desenlace: desenlaceDeNodo(catalogo, nodoDestino),
      x: x[preguntas.length],
      y: nodoY
    });
  }

  // Un enlace por tramo, con la línea al centro y las respuestas apiladas.
  const enlaces: EnlaceRegla[] = [];
  for (let i = 0; i < huecos.length; i++) {
    const textos = etiquetasPorTramo[i];
    if (textos.length === 0) {
      continue;
    }
    const x1 = x[i] + MEDIDAS_REGLA.anchoNodo;
    const x2 = x[i + 1];
    const n = textos.length;
    enlaces.push({
      d: `M ${x1} ${centroFila} H ${x2}`,
      etiquetas: textos.map((texto, k) => ({
        texto,
        x: (x1 + x2) / 2,
        y: centroFila + (k - (n - 1) / 2) * MEDIDAS_REGLA.separacionEtiquetas
      }))
    });
  }

  const anchoFinal = x[Math.max(totalColumnas - 1, 0)] + MEDIDAS_REGLA.anchoNodo + MEDIDAS_REGLA.margen;
  const altoFinal = MEDIDAS_REGLA.margen * 2 + altoFila;
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
