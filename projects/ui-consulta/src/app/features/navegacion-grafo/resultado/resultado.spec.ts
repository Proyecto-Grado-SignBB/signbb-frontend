import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ResultadoComponent } from './resultado';
import { RecorridoResponse, ResultadoDTO } from '../../../models/recorrido.model';

describe('Resultado', () => {
  let component: ResultadoComponent;
  let fixture: ComponentFixture<ResultadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadoComponent],
      providers: [
        provideRouter([{ path: 'resultado/:recorridoId', component: ResultadoComponent }]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function mostrar(resultado: Partial<ResultadoDTO>): HTMLElement {
    const respuesta: RecorridoResponse = {
      recorridoId: 'r1',
      estado: 'FINALIZADO',
      pregunta: null,
      resultado: {
        nivel: 'NORMAL',
        destinoId: 'rec_final',
        mensaje: 'Mensaje del destino',
        razones: [],
        caminoCausal: [],
        ...resultado
      }
    };
    component.respuesta.set(respuesta);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const recomendacion = (id: string, mensaje: string) => ({ nodoId: id, mensaje, caminoCausal: [] });

  it('con una sola recomendación muestra el panel de siempre', () => {
    const el = mostrar({ recomendaciones: [recomendacion('rec_final', 'Mensaje del destino')] });

    expect(el.querySelector('.resultado__panel--tip')?.textContent).toContain('Mensaje del destino');
    expect(el.querySelector('.resultado__lista-recomendaciones')).toBeNull();
  });

  it('sin el campo recomendaciones (backend anterior) muestra el panel de siempre', () => {
    const el = mostrar({});

    expect(el.querySelector('.resultado__panel--tip')).not.toBeNull();
    expect(el.querySelector('.resultado__lista-recomendaciones')).toBeNull();
  });

  it('con varias recomendaciones las lista en orden', () => {
    const el = mostrar({
      recomendaciones: [recomendacion('a', 'Primera'), recomendacion('b', 'Segunda')]
    });

    const items = Array.from(el.querySelectorAll('.resultado__recomendacion')).map(i => i.textContent?.trim());
    expect(items).toEqual(['Primera', 'Segunda']);
    expect(el.querySelector('.resultado__panel--tip')).toBeNull();
    expect(el.querySelector('.resultado__introduccion')).toBeNull();
  });

  it('en el cierre por máximo de preguntas muestra el mensaje general y las recomendaciones logradas', () => {
    const el = mostrar({
      destinoId: 'sistema/limite_preguntas',
      mensaje: 'Respondió el máximo de preguntas sin encontrar señales de alarma.',
      recomendaciones: [recomendacion('a', 'Primera')]
    });

    expect(el.querySelector('.resultado__introduccion')?.textContent).toContain('máximo de preguntas');
    expect(el.querySelectorAll('.resultado__recomendacion').length).toBe(1);
  });

  it('el cierre por máximo de preguntas sin recomendaciones solo muestra el mensaje general', () => {
    const el = mostrar({ destinoId: 'sistema/limite_preguntas', mensaje: 'Mensaje general', recomendaciones: [] });

    expect(el.querySelector('.resultado__panel--tip')?.textContent).toContain('Mensaje general');
    expect(el.querySelector('.resultado__lista-recomendaciones')).toBeNull();
  });

  it('una alerta nunca muestra la lista de recomendaciones', () => {
    const el = mostrar({
      nivel: 'CONSULTAR_MEDICO',
      mensaje: 'Consulte a su pediatra',
      recomendaciones: [recomendacion('a', 'Primera'), recomendacion('b', 'Segunda')]
    });

    expect(el.querySelector('.resultado__lista-recomendaciones')).toBeNull();
    expect(el.querySelector('.resultado__panel--tip')?.textContent).toContain('Consulte a su pediatra');
  });
});
