import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PreguntaComponent } from './pregunta';
import { RecorridoResponse } from '../../../models/recorrido.model';

describe('PreguntaComponent', () => {
  let component: PreguntaComponent;
  let fixture: ComponentFixture<PreguntaComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreguntaComponent],
      providers: [
        provideRouter([{ path: 'pregunta/:recorridoId', component: PreguntaComponent }]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreguntaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('volver()', () => {
    const preguntaAnterior: RecorridoResponse = {
      recorridoId: 'r1',
      estado: 'EN_CURSO',
      pregunta: {
        id: 'q_anterior',
        texto: '¿Pregunta anterior?',
        opciones: ['SI', 'NO'],
        tieneImagenes: false,
        imagenes: []
      },
      resultado: null
    };

    const peticionRetroceder = () => httpMock.expectOne(r => r.url.endsWith('/retroceder'));

    it('pide retroceder al backend y muestra la pregunta anterior', () => {
      component.volver();

      const req = peticionRetroceder();
      expect(req.request.method).toBe('POST');
      req.flush(preguntaAnterior);

      expect(component.respuesta()?.pregunta?.id).toBe('q_anterior');
    });

    it('limpia la selección pendiente al volver', () => {
      component.opcionesSeleccionadas.set(new Set(['tos']));
      component.seleccionActual.set('tos');

      component.volver();
      peticionRetroceder().flush(preguntaAnterior);

      expect(component.opcionesSeleccionadas().size).toBe(0);
      expect(component.seleccionActual()).toBeNull();
    });

    it('en la primera pregunta (400) sale al inicio', () => {
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.volver();
      peticionRetroceder().flush(null, { status: 400, statusText: 'Bad Request' });

      expect(navegar).toHaveBeenCalledWith(['/']);
    });

    it('ante otro error muestra un mensaje y no sale de la pantalla', () => {
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.volver();
      peticionRetroceder().flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.error()).toContain('volver a la pregunta anterior');
      expect(component.volviendo()).toBeFalse();
      expect(navegar).not.toHaveBeenCalled();
    });

    it('ignora un segundo clic mientras la petición sigue en curso', () => {
      component.volver();
      component.volver();

      peticionRetroceder().flush(preguntaAnterior);
    });

    it('ignora un doble clic aunque la primera respuesta ya haya llegado, y luego vuelve a permitirlo',
      fakeAsync(() => {
        component.volver();
        peticionRetroceder().flush(preguntaAnterior);

        component.volver(); // segundo clic casi inmediato: no debe retroceder otra vez
        httpMock.expectNone(r => r.url.endsWith('/retroceder'));

        tick(400);
        expect(component.volviendo()).toBeFalse();

        component.volver(); // pasada la pausa, un clic nuevo sí retrocede
        peticionRetroceder().flush(preguntaAnterior);
        tick(400);
      }));
  });
});
