/**
 * Cuentas de la vista del lienzo: zoom, desplazamiento y mini-mapa. Son
 * funciones puras (no tocan el DOM) para poder probarlas sin navegador; el
 * componente solo lee y escribe el `scroll` real con lo que ellas calculan.
 *
 * Convención: las coordenadas "del contenido" son las de {@link distribuir}
 * (sin zoom); las "de la vista" son píxeles del recuadro que se ve en pantalla.
 */

/** Límites y paso del zoom (1 = 100 %). */
export const ESCALA = {
  min: 0.25,
  max: 1.5,
  /** Lo que multiplica o divide cada pulsación de + o −. */
  paso: 1.25
} as const;

/** Tamaño máximo, en píxeles, de la caja del mini-mapa. */
export const MINIMAPA = { ancho: 200, alto: 130 } as const;

/** Desplazamiento de la vista, en píxeles. */
export interface Desplazamiento {
  izquierda: number;
  arriba: number;
}

/** Rectángulo en coordenadas del contenido. */
export interface Area {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Deja la escala dentro de {@link ESCALA}; un valor no válido vuelve a 100 %. */
export function limitarEscala(escala: number): number {
  if (!Number.isFinite(escala)) {
    return 1;
  }
  return Math.min(ESCALA.max, Math.max(ESCALA.min, escala));
}

/**
 * Cuánto cambia la escala con un golpe de rueda (Ctrl + rueda o pellizco del
 * trackpad). `modo` es el `deltaMode` del evento: 0 píxeles, 1 líneas, 2 páginas.
 * Un golpe de ratón (±100) cambia la escala entre un 14 y un 16 %.
 */
export function factorDeRueda(deltaY: number, modo: number): number {
  const pixeles = modo === 1 ? deltaY * 16 : modo === 2 ? deltaY * 400 : deltaY;
  return Math.exp(-pixeles * 0.0015);
}

/**
 * Escala con la que todo el contenido cabe en la vista. Nunca amplía por
 * encima de 100 % (un lienzo pequeño se queda como está) ni baja del mínimo:
 * si el lienzo es enorme, el mini-mapa ayuda a recorrer lo que no cabe.
 */
export function escalaParaAjustar(
  anchoContenido: number,
  altoContenido: number,
  anchoVista: number,
  altoVista: number
): number {
  if (anchoContenido <= 0 || altoContenido <= 0 || anchoVista <= 0 || altoVista <= 0) {
    return 1;
  }
  return limitarEscala(Math.min(1, anchoVista / anchoContenido, altoVista / altoContenido));
}

/**
 * Desplazamiento que, al cambiar de escala, deja bajo el mismo punto de la
 * vista lo que estaba debajo (el cursor al hacer zoom con la rueda, o el
 * centro al usar los botones).
 */
export function zoomEnPunto(
  escalaAntes: number,
  escalaDespues: number,
  izquierda: number,
  arriba: number,
  puntoX: number,
  puntoY: number
): Desplazamiento {
  const contenidoX = (izquierda + puntoX) / escalaAntes;
  const contenidoY = (arriba + puntoY) / escalaAntes;
  return {
    izquierda: Math.max(0, contenidoX * escalaDespues - puntoX),
    arriba: Math.max(0, contenidoY * escalaDespues - puntoY)
  };
}

/** Desplazamiento que pone el punto del contenido (`x`, `y`) en el centro de la vista. */
export function centrarEn(
  x: number,
  y: number,
  escala: number,
  anchoVista: number,
  altoVista: number
): Desplazamiento {
  return {
    izquierda: Math.max(0, x * escala - anchoVista / 2),
    arriba: Math.max(0, y * escala - altoVista / 2)
  };
}

/** Parte del contenido que se ve ahora, en coordenadas del contenido. */
export function areaVisible(
  izquierda: number,
  arriba: number,
  anchoVista: number,
  altoVista: number,
  escala: number,
  anchoContenido: number,
  altoContenido: number
): Area {
  const x = Math.min(Math.max(0, izquierda / escala), anchoContenido);
  const y = Math.min(Math.max(0, arriba / escala), altoContenido);
  return {
    x,
    y,
    ancho: Math.min(anchoVista / escala, anchoContenido - x),
    alto: Math.min(altoVista / escala, altoContenido - y)
  };
}

/** true si el contenido, ya con zoom, no cabe entero en la vista (hace falta moverse). */
export function noCabeEnLaVista(
  anchoContenido: number,
  altoContenido: number,
  escala: number,
  anchoVista: number,
  altoVista: number
): boolean {
  const tolerancia = 1;
  return anchoContenido * escala > anchoVista + tolerancia || altoContenido * escala > altoVista + tolerancia;
}

/** Escala del mini-mapa: el contenido entero cabe en la caja sin deformarse. */
export function escalaMinimapa(
  anchoContenido: number,
  altoContenido: number,
  maxAncho: number,
  maxAlto: number
): number {
  if (anchoContenido <= 0 || altoContenido <= 0) {
    return 1;
  }
  return Math.min(maxAncho / anchoContenido, maxAlto / altoContenido);
}
