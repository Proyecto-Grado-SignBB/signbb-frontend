import { NodoLienzo, RespuestaLienzo } from '../../../models/lienzo.model';

/** Medidas del lienzo, en píxeles. */
export const MEDIDAS = {
  anchoNodo: 230,
  altoNodo: 84,
  /** Distancia entre el borde izquierdo de dos columnas (deja sitio a la etiqueta de la respuesta). */
  columna: 420,
  /** Distancia entre dos filas. */
  fila: 112,
  margen: 32,
  anchoMas: 44,
  anchoEnlace: 200,
  altoEnlace: 36
};

/** Un nodo ubicado. `x`, `y` son la esquina superior izquierda de su tarjeta. */
export interface CajaNodo {
  nodo: NodoLienzo;
  x: number;
  y: number;
  profundidad: number;
  /** true si no se llega a él desde la primera pregunta (bloquea la publicación). */
  suelto: boolean;
}

/**
 * Lo que hay al final de una respuesta:
 * - `nodo`: el nodo al que lleva, dibujado como hijo;
 * - `mas`: todavía no dice qué pasa después (el "+");
 * - `enlace`: lleva a una pregunta que ya está dibujada en otro lugar, y se
 *   muestra como chip "↪ va a: …" con línea punteada.
 */
export type TipoRama = 'nodo' | 'mas' | 'enlace';

/** Una respuesta ubicada en el lienzo, con su línea en ángulo recto. */
export interface Rama {
  origenId: string;
  respuesta: RespuestaLienzo;
  tipo: TipoRama;
  /** Id del nodo destino (para `nodo` y `enlace`). */
  destinoId: string | null;
  /** Texto del destino, para el chip de `enlace`. */
  destinoTexto: string | null;
  /** Esquina superior izquierda de lo que se dibuja al final (nodo, "+" o chip). */
  x: number;
  y: number;
  /** Atributo `d` del `<path>`: salida del origen → codo → entrada al final. */
  d: string;
  /** Dónde va la etiqueta de la respuesta (sobre el tramo horizontal final). */
  etiquetaX: number;
  etiquetaY: number;
}

/** Resultado del cálculo de posiciones: nodos, ramas y tamaño total del lienzo. */
export interface Distribucion {
  nodos: CajaNodo[];
  ramas: Rama[];
  ancho: number;
  alto: number;
}

/**
 * Ubica el lienzo como un árbol que crece hacia la derecha, como en el deck:
 * una columna por profundidad, una fila por hoja (cada "+", chip o conclusión)
 * y cada pregunta a la altura media de lo que cuelga de ella.
 *
 * Se recorre en profundidad desde la primera pregunta: la primera vez que se
 * llega a un nodo se dibuja ahí; si otra respuesta vuelve a llevar a él, esa
 * respuesta se dibuja como `enlace`. Los nodos sueltos se ubican después, en
 * las filas de abajo, con `suelto = true`.
 *
 * Es una función pura: no toca el DOM y no depende del alto real de las
 * tarjetas (todas miden lo mismo).
 */
export function distribuir(inicio: string | null, nodos: NodoLienzo[]): Distribucion {
  const porId = new Map(nodos.map(n => [n.id, n]));
  const filaDe = new Map<string, number>();
  const cajas: CajaNodo[] = [];
  const pendientes: { origen: NodoLienzo; profundidad: number; respuesta: RespuestaLienzo; tipo: TipoRama; fila: number }[] = [];
  let siguienteFila = 0;
  let profundidadMaxima = 0;

  const colocar = (nodo: NodoLienzo, profundidad: number, suelto: boolean): number => {
    filaDe.set(nodo.id, -1); // en curso: protege de ciclos
    profundidadMaxima = Math.max(profundidadMaxima, profundidad);
    const filas: number[] = [];
    if (nodo.tipo === 'PREGUNTA') {
      for (const respuesta of nodo.respuestas) {
        const destino = respuesta.destino ? porId.get(respuesta.destino) : undefined;
        let tipo: TipoRama;
        let fila: number;
        if (!destino) {
          tipo = 'mas';
          fila = siguienteFila++;
          profundidadMaxima = Math.max(profundidadMaxima, profundidad + 1);
        } else if (filaDe.has(destino.id)) {
          tipo = 'enlace';
          fila = siguienteFila++;
          profundidadMaxima = Math.max(profundidadMaxima, profundidad + 1);
        } else {
          tipo = 'nodo';
          fila = colocar(destino, profundidad + 1, suelto);
        }
        pendientes.push({ origen: nodo, profundidad, respuesta, tipo, fila });
        filas.push(fila);
      }
    }
    const fila = filas.length > 0 ? (filas[0] + filas[filas.length - 1]) / 2 : siguienteFila++;
    filaDe.set(nodo.id, fila);
    cajas.push({ nodo, x: xDe(profundidad), y: yDe(fila), profundidad, suelto });
    return fila;
  };

  const primero = inicio ? porId.get(inicio) : undefined;
  if (primero) {
    colocar(primero, 0, false);
  }
  for (const nodo of nodos) {
    if (!filaDe.has(nodo.id)) {
      colocar(nodo, 0, true);
    }
  }

  const ramas = pendientes.map(p =>
    rama(p.origen, p.profundidad, filaDe.get(p.origen.id) ?? 0, p.respuesta, p.tipo, p.fila, porId));
  cajas.sort((a, b) => nodos.indexOf(a.nodo) - nodos.indexOf(b.nodo));
  return {
    nodos: cajas,
    ramas,
    ancho: xDe(profundidadMaxima) + Math.max(MEDIDAS.anchoNodo, MEDIDAS.anchoEnlace) + MEDIDAS.margen,
    alto: yDe(Math.max(siguienteFila - 1, 0)) + MEDIDAS.altoNodo + MEDIDAS.margen
  };
}

/** Coordenada X (borde izquierdo) de una columna. */
function xDe(profundidad: number): number {
  return MEDIDAS.margen + profundidad * MEDIDAS.columna;
}

/** Coordenada Y (borde superior) de una fila. */
function yDe(fila: number): number {
  return MEDIDAS.margen + fila * MEDIDAS.fila;
}

/** Arma la rama (línea en ángulo recto y etiqueta) de una respuesta. */
function rama(
  origen: NodoLienzo,
  profundidad: number,
  filaOrigen: number,
  respuesta: RespuestaLienzo,
  tipo: TipoRama,
  fila: number,
  porId: Map<string, NodoLienzo>
): Rama {
  const centro = yDe(fila) + MEDIDAS.altoNodo / 2;
  const x = xDe(profundidad + 1);
  const alto = tipo === 'nodo' ? MEDIDAS.altoNodo : tipo === 'mas' ? MEDIDAS.anchoMas : MEDIDAS.altoEnlace;
  const y = centro - alto / 2;

  const salidaX = xDe(profundidad) + MEDIDAS.anchoNodo;
  const salidaY = yDe(filaOrigen) + MEDIDAS.altoNodo / 2;
  const codoX = salidaX + 28;
  const d = `M ${salidaX} ${salidaY} H ${codoX} V ${centro} H ${x}`;

  const destino = respuesta.destino ? porId.get(respuesta.destino) ?? null : null;
  return {
    origenId: origen.id,
    respuesta,
    tipo,
    destinoId: tipo === 'mas' ? null : destino?.id ?? null,
    destinoTexto: tipo === 'enlace' ? destino?.texto ?? null : null,
    x,
    y,
    d,
    etiquetaX: codoX + 10,
    etiquetaY: centro
  };
}
