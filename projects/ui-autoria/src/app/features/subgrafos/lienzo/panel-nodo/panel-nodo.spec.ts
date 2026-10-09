import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodoLienzo, NodoRequest } from '../../../../models/lienzo.model';
import { ContextoPanel, PanelNodoComponent } from './panel-nodo';

const TERMOMETRO: NodoLienzo = {
  id: 'pregunta_1', tipo: 'PREGUNTA', texto: '¿Cuánto marca el termómetro?', variasRespuestas: false, desenlace: null,
  respuestas: [
    { id: 'r_2', texto: 'Menos de 38 °C', gravedad: 'LEVE', destino: null },
    { id: 'r_3', texto: 'Más de 39 °C', gravedad: 'GRAVE', destino: 'conclusion_4' }
  ]
};

describe('PanelNodoComponent', () => {
  let fixture: ComponentFixture<PanelNodoComponent>;
  let el: HTMLElement;

  async function abrir(contexto: ContextoPanel, preguntas: NodoLienzo[] = [TERMOMETRO]): Promise<void> {
    fixture.componentRef.setInput('contexto', contexto);
    fixture.componentRef.setInput('preguntas', preguntas);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function escribir(selector: string, valor: string, indice = 0): Promise<void> {
    const campo = el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)[indice];
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
    if (!b) throw new Error(`no hay un botón "${texto}"`);
    return b;
  }

  function enviar(): void {
    el.querySelector<HTMLElement>('.panel-foot app-boton:last-of-type button')!.click();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PanelNodoComponent] }).compileComponents();
    fixture = TestBed.createComponent(PanelNodoComponent);
    el = fixture.nativeElement;
  });

  it('después de un "+" crea una pregunta conectada a esa respuesta', async () => {
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] });
    expect(el.querySelector('.contexto')?.textContent).toContain('Menos de 38 °C');

    let emitido: NodoRequest | undefined;
    fixture.componentInstance.crear.subscribe(r => (emitido = r));

    await escribir('textarea', '¿Está decaído o no quiere comer?');
    await escribir('.respuesta input', 'Sí', 0);
    el.querySelectorAll<HTMLButtonElement>('.respuesta')[0].querySelector<HTMLButtonElement>('.luz--MODERADA')!.click();
    await escribir('.respuesta input', 'No', 1);
    fixture.detectChanges();
    enviar();

    expect(emitido).toEqual({
      texto: '¿Está decaído o no quiere comer?',
      variasRespuestas: false,
      respuestas: [
        { id: null, texto: 'Sí', gravedad: 'MODERADA' },
        { id: null, texto: 'No', gravedad: 'LEVE' }
      ],
      tipo: 'PREGUNTA',
      despuesDe: { nodoId: 'pregunta_1', respuestaId: 'r_2' }
    });
  });

  it('una conclusión necesita desenlace y mensaje', async () => {
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] });
    let emitido: NodoRequest | undefined;
    fixture.componentInstance.crear.subscribe(r => (emitido = r));

    boton('Conclusión').click();
    fixture.detectChanges();
    await escribir('textarea', 'Dele líquidos y vuelva a medir en una hora.');
    enviar();
    expect(emitido).toBeUndefined();

    boton('Recomendación').click();
    fixture.detectChanges();
    enviar();
    expect(emitido?.tipo).toBe('CONCLUSION');
    expect(emitido?.desenlace).toBe('RECOMENDACION');
  });

  it('"Pregunta existente" no ofrece la misma pregunta y emite el enlace', async () => {
    const otra: NodoLienzo = { ...TERMOMETRO, id: 'pregunta_6', texto: '¿Está decaído?', respuestas: [] };
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] }, [TERMOMETRO, otra]);
    let enlace: { respuestaId: string; nodoId: string | null } | undefined;
    fixture.componentInstance.enlazar.subscribe(e => (enlace = e));

    boton('Pregunta existente').click();
    fixture.detectChanges();
    const select = el.querySelector('select')!;
    const opciones = [...select.options].map(o => o.textContent?.trim());
    expect(opciones).not.toContain('¿Cuánto marca el termómetro?');

    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    enviar();
    expect(enlace).toEqual({ respuestaId: 'r_2', nodoId: 'pregunta_6' });
  });

  it('al editar conserva el id de cada respuesta (y así su destino)', async () => {
    await abrir({ tipo: 'editar', nodo: TERMOMETRO });
    let guardado: { nodoId: string; request: NodoRequest } | undefined;
    fixture.componentInstance.guardar.subscribe(g => (guardado = g));

    expect(el.querySelector('.segmentado')).toBeNull();
    await escribir('.respuesta input', 'Más de 39,5 °C', 1);
    enviar();

    expect(guardado?.nodoId).toBe('pregunta_1');
    expect(guardado?.request.respuestas).toEqual([
      { id: 'r_2', texto: 'Menos de 38 °C', gravedad: 'LEVE' },
      { id: 'r_3', texto: 'Más de 39,5 °C', gravedad: 'GRAVE' }
    ]);
    expect(guardado?.request.tipo).toBeUndefined();
  });
});
