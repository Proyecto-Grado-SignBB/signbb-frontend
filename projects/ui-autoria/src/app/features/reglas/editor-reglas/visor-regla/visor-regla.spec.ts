import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CatalogoDTO } from '../../../../models/regla.model';
import { VisorReglaComponent } from './visor-regla';

const CATALOGO: CatalogoDTO = {
  grafoId: 'grafo_fiebre',
  nodos: [
    { id: 'pregunta_1', texto: '¿Cuánto marca el termómetro?', tipo: 'pregunta', opciones: ['Más de 39 °C'], desenlace: null },
    { id: 'conclusion_5', texto: 'Lleve al bebé a urgencias.', tipo: 'terminal', opciones: [], desenlace: 'URGENCIA' }
  ]
};

describe('VisorReglaComponent', () => {
  let fixture: ComponentFixture<VisorReglaComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VisorReglaComponent] }).compileComponents();
    fixture = TestBed.createComponent(VisorReglaComponent);
    fixture.componentRef.setInput('casos', [[{ idNodo: 'pregunta_1', respuesta: 'Más de 39 °C' }]]);
    fixture.componentRef.setInput('nodoDestino', 'conclusion_5');
    fixture.componentRef.setInput('catalogo', CATALOGO);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('dibuja la arista y el destino con el color de su desenlace', () => {
    expect(el.querySelector('.gelabel--resaltada')?.textContent).toContain('Más de 39 °C');
    expect(el.querySelector('.gnodo--urgencia')).toBeTruthy();
  });

  it('abre la ventana ampliada del caso con sus controles de zoom', () => {
    const expandir = [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find(b => b.textContent?.trim() === 'Expandir');
    expect(expandir).toBeTruthy();
    expandir!.click();
    fixture.detectChanges();

    expect(el.querySelector('.overlay-grafo')).toBeTruthy();
    expect(el.querySelector('.controles-zoom')).toBeTruthy();
    expect(el.querySelector('.grafo-lienzo--grande')).toBeTruthy();
  });

  it('al expandir ajusta-llenando: escala el caso para ocupar la ventana', async () => {
    const expandir = [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find(b => b.textContent?.trim() === 'Expandir');
    expandir!.click();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    const scroll = el.querySelector<HTMLElement>('.overlay-scroll')!;
    const sizer = el.querySelector<HTMLElement>('.overlay-scroll .grafo-sizer')!;
    const lienzo = el.querySelector<HTMLElement>('.grafo-lienzo--grande')!;
    const estilo = getComputedStyle(scroll);
    const disponibleW = scroll.clientWidth
      - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    const disponibleH = scroll.clientHeight
      - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    const anchoBase = parseFloat(lienzo.style.width);
    const altoBase = parseFloat(lienzo.style.height);
    const esperada = Math.min(2, Math.max(0.25, Math.min(disponibleW / anchoBase, disponibleH / altoBase)));

    expect(parseFloat(sizer.style.width)).toBeCloseTo(anchoBase * esperada, 0);
  });
});
