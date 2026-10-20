import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodoLienzo } from '../../../models/lienzo.model';
import { VisorGrafoComponent } from './visor-grafo';

const NODOS: NodoLienzo[] = [
  {
    id: 'q1',
    tipo: 'PREGUNTA',
    texto: '¿Observa algún signo de alarma?',
    variasRespuestas: true,
    desenlace: null,
    respuestas: [
      { id: 'r1', texto: 'Quejido al respirar', gravedad: 'GRAVE', destino: 'c1' },
      { id: 'r2', texto: 'Aleteo nasal', gravedad: 'GRAVE', destino: 'c1' }
    ]
  },
  {
    id: 'c1',
    tipo: 'CONCLUSION',
    texto: 'URGENCIA',
    variasRespuestas: false,
    desenlace: 'URGENCIA',
    respuestas: []
  }
];

describe('VisorGrafoComponent', () => {
  let fixture: ComponentFixture<VisorGrafoComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisorGrafoComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(VisorGrafoComponent);
    el = fixture.nativeElement;
    fixture.componentInstance.inicio = 'q1';
    fixture.componentInstance.nodos = NODOS;
    fixture.detectChanges();
  });

  it('dibuja las preguntas, conclusiones y enlaces repetidos', () => {
    expect(el.querySelectorAll('.nodo').length).toBe(2);
    expect(el.querySelectorAll('.enlace').length).toBe(1);
    expect(el.querySelectorAll('.etiqueta-rama').length).toBe(2);
    expect(el.textContent).toContain('Primera pregunta');
    expect(el.textContent).toContain('URGENCIA');
  });

  it('permite cambiar el zoom', () => {
    const acercar = el.querySelector<HTMLButtonElement>('[aria-label="Acercar"]')!;
    expect(el.querySelector('.porcentaje')?.textContent).toContain('100 %');
    acercar.click();
    fixture.detectChanges();
    expect(el.querySelector('.porcentaje')?.textContent).not.toContain('100 %');
  });
});
