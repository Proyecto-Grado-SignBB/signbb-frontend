import { NodoLienzo } from '../../../models/lienzo.model';
import { MEDIDAS, distribuir } from './layout';

/** El lienzo de fiebre del deck, como lo devuelve el backend. */
function fiebre(): NodoLienzo[] {
  return [
    {
      id: 'pregunta_1', tipo: 'PREGUNTA', texto: '¿Cuánto marca el termómetro?', variasRespuestas: false, desenlace: null,
      respuestas: [
        { id: 'r_2', texto: 'Menos de 38 °C', gravedad: 'LEVE', destino: 'pregunta_6' },
        { id: 'r_3', texto: 'Entre 38 y 39 °C', gravedad: 'MODERADA', destino: 'pregunta_6' },
        { id: 'r_4', texto: 'Más de 39 °C', gravedad: 'GRAVE', destino: 'conclusion_5' }
      ]
    },
    { id: 'conclusion_5', tipo: 'CONCLUSION', texto: 'Lleve al bebé a urgencias ahora.', variasRespuestas: false, desenlace: 'URGENCIA', respuestas: [] },
    {
      id: 'pregunta_6', tipo: 'PREGUNTA', texto: '¿Está decaído o no quiere comer?', variasRespuestas: false, desenlace: null,
      respuestas: [
        { id: 'r_7', texto: 'Sí', gravedad: 'MODERADA', destino: 'conclusion_9' },
        { id: 'r_8', texto: 'No', gravedad: 'LEVE', destino: null }
      ]
    },
    { id: 'conclusion_9', tipo: 'CONCLUSION', texto: 'Pida una cita hoy.', variasRespuestas: false, desenlace: 'CONSULTA_MEDICA', respuestas: [] }
  ];
}

describe('distribuir (layout del lienzo)', () => {
  it('un lienzo vacío no tiene nodos ni ramas', () => {
    const d = distribuir(null, []);
    expect(d.nodos).toEqual([]);
    expect(d.ramas).toEqual([]);
  });

  it('una columna por profundidad', () => {
    const d = distribuir('pregunta_1', fiebre());
    const prof = Object.fromEntries(d.nodos.map(c => [c.nodo.id, c.profundidad]));
    expect(prof).toEqual({ pregunta_1: 0, conclusion_5: 1, pregunta_6: 1, conclusion_9: 2 });
    const x = (id: string) => d.nodos.find(c => c.nodo.id === id)!.x;
    expect(x('pregunta_6') - x('pregunta_1')).toBe(MEDIDAS.columna);
  });

  it('la respuesta sin destino es un "+" y la que vuelve a una pregunta ya dibujada es un enlace', () => {
    const d = distribuir('pregunta_1', fiebre());
    const tipo = Object.fromEntries(d.ramas.map(r => [r.respuesta.id, r.tipo]));
    expect(tipo).toEqual({ r_2: 'nodo', r_3: 'enlace', r_4: 'nodo', r_7: 'nodo', r_8: 'mas' });
    const enlace = d.ramas.find(r => r.respuesta.id === 'r_3')!;
    expect(enlace.destinoId).toBe('pregunta_6');
    expect(enlace.destinoTexto).toBe('¿Está decaído o no quiere comer?');
  });

  it('cada pregunta queda a la altura media de lo que cuelga de ella', () => {
    const d = distribuir('pregunta_1', fiebre());
    const centro = (id: string) => d.nodos.find(c => c.nodo.id === id)!.y + MEDIDAS.altoNodo / 2;
    const centroRama = (id: string) => d.ramas.find(r => r.respuesta.id === id)!.etiquetaY;

    // pregunta_6: filas 0 (Sí) y 1 (+ de No).
    expect(centro('pregunta_6')).toBe((centroRama('r_7') + centroRama('r_8')) / 2);
    // pregunta_1: de la primera rama (pregunta_6) a la última (urgencia).
    expect(centro('pregunta_1')).toBe((centro('pregunta_6') + centro('conclusion_5')) / 2);
  });

  it('las líneas salen del borde derecho del origen y entran por la izquierda del destino', () => {
    const d = distribuir('pregunta_1', fiebre());
    const origen = d.nodos.find(c => c.nodo.id === 'pregunta_1')!;
    const r = d.ramas.find(x => x.respuesta.id === 'r_4')!;
    expect(r.d.startsWith(`M ${origen.x + MEDIDAS.anchoNodo} ${origen.y + MEDIDAS.altoNodo / 2}`)).toBeTrue();
    expect(r.d.endsWith(`H ${r.x}`)).toBeTrue();
  });

  it('los nodos sueltos se dibujan debajo y marcados', () => {
    const nodos = fiebre();
    nodos.push({ id: 'conclusion_11', tipo: 'CONCLUSION', texto: 'Suelta', variasRespuestas: false, desenlace: 'RECOMENDACION', respuestas: [] });
    const d = distribuir('pregunta_1', nodos);
    const suelto = d.nodos.find(c => c.nodo.id === 'conclusion_11')!;
    expect(suelto.suelto).toBeTrue();
    expect(suelto.profundidad).toBe(0);
    expect(Math.max(...d.nodos.filter(c => !c.suelto).map(c => c.y))).toBeLessThan(suelto.y);
    expect(d.alto).toBeGreaterThan(suelto.y);
  });

  it('una pregunta sin respuestas ocupa su propia fila', () => {
    const d = distribuir('pregunta_1', [
      { id: 'pregunta_1', tipo: 'PREGUNTA', texto: '¿?', variasRespuestas: false, desenlace: null, respuestas: [] }
    ]);
    expect(d.nodos.length).toBe(1);
    expect(d.nodos[0].y).toBe(MEDIDAS.margen);
  });
});
