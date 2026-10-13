import { CatalogoDTO } from '../../../../models/regla.model';
import { distribuirCaso, distribuirCasos } from './layout-regla';

describe('layout-regla', () => {
  const catalogo: CatalogoDTO = {
    grafoId: 'grafo_fiebre',
    nodos: [
      { id: 'pregunta_1', texto: '¿Cuánto marca el termómetro?', tipo: 'pregunta', opciones: ['Más de 39 °C'], desenlace: null },
      { id: 'pregunta_2', texto: '¿Está decaído?', tipo: 'pregunta', opciones: ['Sí', 'No'], desenlace: null },
      { id: 'conclusion_5', texto: 'Lleve al bebé a urgencias.', tipo: 'terminal', opciones: [], desenlace: 'URGENCIA' }
    ]
  };

  it('un caso sin condiciones queda vacío', () => {
    const vista = distribuirCaso([], catalogo, 'conclusion_5');
    expect(vista.vacio).toBeTrue();
    expect(vista.pasos.length).toBe(0);
    expect(vista.enlaces.length).toBe(0);
  });

  it('un caso con dos preguntas arma una cadena hasta el destino', () => {
    const vista = distribuirCaso([
      { idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' },
      { idNodo: 'pregunta_2', respuesta: 'Sí' }
    ], catalogo, 'conclusion_5');

    expect(vista.vacio).toBeFalse();
    expect(vista.pasos.map(p => p.id)).toEqual(['pregunta_1', 'pregunta_2', 'conclusion_5']);
    expect(vista.pasos[2].tipo).toBe('terminal');
    expect(vista.enlaces.length).toBe(2);
    expect(vista.enlaces.flatMap(e => e.etiquetas.map(t => t.texto))).toEqual(['Más de 39 °C', 'Sí']);
  });

  it('varias condiciones de la misma pregunta comparten una sola arista apilada', () => {
    const vista = distribuirCaso([
      { idNodo: 'pregunta_2', respuesta: 'Sí' },
      { idNodo: 'pregunta_2', respuesta: 'No' }
    ], catalogo, 'conclusion_5');

    expect(vista.pasos.map(p => p.id)).toEqual(['pregunta_2', 'conclusion_5']);
    expect(vista.enlaces.length).toBe(1);
    expect(vista.enlaces[0].etiquetas.map(e => e.texto)).toEqual(['Sí', 'No']);
    expect(vista.enlaces[0].etiquetas[0].y).not.toBe(vista.enlaces[0].etiquetas[1].y);
  });

  it('ignora condiciones a medio llenar', () => {
    const vista = distribuirCaso([
      { idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' },
      { idNodo: '', respuesta: '' }
    ], catalogo, 'conclusion_5');
    expect(vista.enlaces.length).toBe(1);
    expect(vista.enlaces[0].etiquetas.length).toBe(1);
  });

  it('distribuye varios casos', () => {
    const vistas = distribuirCasos([
      [{ idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' }],
      []
    ], catalogo, 'conclusion_5');
    expect(vistas.length).toBe(2);
    expect(vistas[0].vacio).toBeFalse();
    expect(vistas[1].vacio).toBeTrue();
  });

  it('el terminal lleva el desenlace del catálogo', () => {
    const vista = distribuirCaso(
      [{ idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' }], catalogo, 'conclusion_5');

    const terminal = vista.pasos.find(p => p.tipo === 'terminal');
    expect(terminal?.desenlace).toBe('URGENCIA');
  });

  it('la separación entre columnas crece con la etiqueta más larga', () => {
    const corta = distribuirCaso([
      { idNodo: 'pregunta_1', respuesta: 'Sí' },
      { idNodo: 'pregunta_2', respuesta: 'Sí' }
    ], catalogo, '');
    const larga = distribuirCaso([
      { idNodo: 'pregunta_1', respuesta: 'Respira persistentemente rápido (≥60/min)' },
      { idNodo: 'pregunta_2', respuesta: 'Sí' }
    ], catalogo, '');

    expect(larga.ancho).toBeGreaterThan(corta.ancho);
  });
});
