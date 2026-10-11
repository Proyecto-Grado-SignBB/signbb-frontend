import { CatalogoDTO } from '../../../../models/regla.model';
import { distribuirCaso, distribuirCasos } from './layout-regla';

describe('layout-regla', () => {
  const catalogo: CatalogoDTO = {
    grafoId: 'grafo_fiebre',
    nodos: [
      { id: 'pregunta_1', texto: '¿Cuánto marca el termómetro?', tipo: 'pregunta', opciones: ['Más de 39 °C'] },
      { id: 'pregunta_2', texto: '¿Está decaído?', tipo: 'pregunta', opciones: ['Sí', 'No'] },
      { id: 'conclusion_5', texto: 'Lleve al bebé a urgencias.', tipo: 'terminal', opciones: [] }
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
    expect(vista.enlaces.map(e => e.etiqueta)).toEqual(['Más de 39 °C', 'Sí']);
  });

  it('dos condiciones sobre la misma pregunta salen al destino', () => {
    const vista = distribuirCaso([
      { idNodo: 'pregunta_2', respuesta: 'Sí' },
      { idNodo: 'pregunta_2', respuesta: 'No' }
    ], catalogo, 'conclusion_5');

    expect(vista.pasos.map(p => p.id)).toEqual(['pregunta_2', 'conclusion_5']);
    expect(vista.enlaces.length).toBe(2);
    expect(vista.enlaces[0].etiquetaY).not.toBe(vista.enlaces[1].etiquetaY);
  });

  it('ignora condiciones a medio llenar', () => {
    const vista = distribuirCaso([
      { idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' },
      { idNodo: '', respuesta: '' }
    ], catalogo, 'conclusion_5');
    expect(vista.enlaces.length).toBe(1);
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
});
