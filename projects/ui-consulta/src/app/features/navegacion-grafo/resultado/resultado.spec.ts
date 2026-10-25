import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SesionService } from 'ui-compartida';
import { ResultadoComponent } from './resultado';
import { RecorridoResponse, ResultadoDTO } from '../../../models/recorrido.model';
import { CLAVE_SESION_CONSULTA, proveerSesion } from '../../../core/sesion/sesion';

const SESION_PADRE = {
  token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true }
};

describe('Resultado', () => {
  let component: ResultadoComponent;
  let fixture: ComponentFixture<ResultadoComponent>;

  beforeEach(async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await TestBed.configureTestingModule({
      imports: [ResultadoComponent],
      providers: [
        provideRouter([{ path: 'resultado/:recorridoId', component: ResultadoComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...proveerSesion()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

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

  describe('ilustración animada', () => {
    it('muestra la carita feliz en NORMAL, entre el título y el texto', () => {
      const el = mostrar({ nivel: 'NORMAL' });

      expect(el.querySelector('app-ilustracion-resultado .ilu--feliz')).not.toBeNull();
      const hijos = Array.from(el.querySelector('.resultado__textos')!.children).map(h => h.tagName.toLowerCase());
      expect(hijos).toEqual(['h1', 'app-ilustracion-resultado', 'p']);
    });

    it('queda centrada en el bloque del título, en los tres niveles', () => {
      for (const nivel of ['NORMAL', 'CONSULTAR_MEDICO', 'URGENCIA'] as const) {
        const el = mostrar({ nivel, razones: nivel === 'URGENCIA' ? ['Quejido al respirar'] : [] });
        const centro = (r: DOMRect) => r.left + r.width / 2;
        const hero = el.querySelector('.resultado__hero')!.getBoundingClientRect();
        const ilustracion = el.querySelector('app-ilustracion-resultado')!.getBoundingClientRect();

        expect(el.querySelector('.resultado__textos')!.getBoundingClientRect().width).toBeGreaterThan(ilustracion.width);
        expect(Math.abs(centro(ilustracion) - centro(hero))).withContext(nivel).toBeLessThan(1);
      }
    });

    it('muestra el médico en CONSULTAR_MEDICO', () => {
      const el = mostrar({ nivel: 'CONSULTAR_MEDICO' });

      expect(el.querySelector('app-ilustracion-resultado .ilu--medico')).not.toBeNull();
      expect(el.querySelector('.ilu--feliz')).toBeNull();
    });

    it('muestra el hospital en URGENCIA', () => {
      const el = mostrar({ nivel: 'URGENCIA', razones: ['Quejido al respirar'] });

      expect(el.querySelector('app-ilustracion-resultado .ilu--hospital')).not.toBeNull();
      expect(el.querySelector('.ilu--medico')).toBeNull();
    });

    it('es decorativa: va oculta para lectores de pantalla', () => {
      const el = mostrar({ nivel: 'NORMAL' });

      expect(el.querySelector('app-ilustracion-resultado svg')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('corregirUltimaRespuesta()', () => {
    it('retrocede en el backend y vuelve a la pantalla de pregunta', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.corregirUltimaRespuesta();

      const req = httpMock.expectOne(r => r.url.endsWith('/retroceder'));
      expect(req.request.method).toBe('POST');
      req.flush({
        recorridoId: 'r1',
        estado: 'EN_CURSO',
        pregunta: { id: 'q', texto: '¿Q?', opciones: ['SI', 'NO'], tieneImagenes: false, imagenes: [] },
        resultado: null
      });

      expect(navegar).toHaveBeenCalledWith(['/pregunta', 'r1']);
    });

    it('si el backend falla muestra el error y se queda en el resultado', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.corregirUltimaRespuesta();
      httpMock.expectOne(r => r.url.endsWith('/retroceder'))
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.error()).toContain('volver a la pregunta anterior');
      expect(navegar).not.toHaveBeenCalled();
    });
  });

  describe('recorrido no disponible', () => {
    it('al cargar, un 404 vuelve al inicio con el aviso', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.cargar();
      httpMock.match(r => r.method === 'GET')
        .forEach(req => req.flush(null, { status: 404, statusText: 'Not Found' }));

      expect(navegar).toHaveBeenCalledWith(['/'], { queryParams: { aviso: 'recorrido' } });
      expect(component.error()).toBeNull();
    });

    it('al corregir, un 404 vuelve al inicio con el aviso', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.corregirUltimaRespuesta();
      httpMock.expectOne(r => r.url.endsWith('/retroceder'))
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(navegar).toHaveBeenCalledWith(['/'], { queryParams: { aviso: 'recorrido' } });
    });
  });

  describe('botones de emergencia', () => {
    it('en URGENCIA «Buscar ayuda ahora» llama a la línea 123', () => {
      const el = mostrar({ nivel: 'URGENCIA', razones: ['Regla Respiración Urgencia'] });

      const enlace = el.querySelector<HTMLAnchorElement>('.resultado__acciones a[href="tel:123"]');
      expect(enlace?.textContent).toContain('Buscar ayuda ahora');
    });

    it('en URGENCIA anuncia «Urgencias cercanas» como función próxima, sin acción', () => {
      const el = mostrar({ nivel: 'URGENCIA', razones: ['Regla Respiración Urgencia'] });

      const tarjeta = el.querySelector('.resultado__proximamente');
      expect(tarjeta?.textContent).toContain('Urgencias cercanas');
      expect(tarjeta?.textContent).toContain('Próximamente');
      expect(tarjeta?.getAttribute('aria-disabled')).toBe('true');
      expect(tarjeta?.querySelector('a, button')).toBeNull();
    });

    it('en CONSULTAR_MEDICO el panel del pediatra empieza cerrado y se abre con el botón', () => {
      const el = mostrar({ nivel: 'CONSULTAR_MEDICO', razones: ['Regla Fiebre'] });
      expect(el.querySelector('.resultado__pediatra')).toBeNull();

      component.alternarPanelPediatra();
      fixture.detectChanges();

      const panel = el.querySelector('.resultado__pediatra')!;
      expect(panel.textContent).toContain('Regla Fiebre');
      expect(panel.textContent).toContain('Cuándo empezó el signo');
      expect(panel.querySelector('a[href="tel:123"]')).not.toBeNull();
    });

    it('sin número guardado, el panel ofrece guardarlo', () => {
      const el = mostrar({ nivel: 'CONSULTAR_MEDICO' });
      component.alternarPanelPediatra();
      fixture.detectChanges();

      expect(el.querySelector('.resultado__pediatra app-telefono-pediatra input')).not.toBeNull();
      expect(el.querySelector('.resultado__pediatra a[href^="tel:3"]')).toBeNull();
    });

    it('con número guardado, el panel llama al pediatra', () => {
      const httpMock = TestBed.inject(HttpTestingController);
      TestBed.inject(SesionService).guardarTelefonoPediatra('300 123 4567').subscribe();
      httpMock.expectOne(r => r.url.endsWith('/auth/yo/pediatra'))
        .flush({ ...SESION_PADRE.usuario, telefonoPediatra: '300 123 4567' });

      const el = mostrar({ nivel: 'CONSULTAR_MEDICO' });
      component.alternarPanelPediatra();
      fixture.detectChanges();

      const llamar = el.querySelector<HTMLAnchorElement>('.resultado__pediatra a[href="tel:3001234567"]');
      expect(llamar?.textContent).toContain('Llamar a mi pediatra');
      expect(el.querySelector('.resultado__pediatra app-telefono-pediatra')).toBeNull();
    });
  });

  describe('¿Por qué este resultado?', () => {
    const camino = [
      { nodoId: 'inicio', condicion: '', contenido: '¿Respira con dificultad?' },
      { nodoId: 'q2', condicion: 'SI', contenido: '¿Desde hace cuánto?' },
      { nodoId: 'urg', condicion: 'MENOS_DE_24_HORAS', contenido: 'Ve a urgencias' }
    ];

    it('empareja cada pregunta con la respuesta dada, traducida', () => {
      const el = mostrar({ nivel: 'URGENCIA', razones: ['Regla Respiración Urgencia'], caminoCausal: camino });

      expect(component.pasosLegibles()).toEqual([
        { pregunta: '¿Respira con dificultad?', respuesta: 'Sí' },
        { pregunta: '¿Desde hace cuánto?', respuesta: 'Menos de 24 horas' }
      ]);
      expect(el.querySelectorAll('.resultado__camino li').length).toBe(2);
    });

    it('en CONSULTAR_MEDICO también muestra los nombres de las reglas', () => {
      const el = mostrar({ nivel: 'CONSULTAR_MEDICO', razones: ['Regla Fiebre'], caminoCausal: camino });

      expect(el.querySelector('.resultado__porque-razones')?.textContent).toContain('Regla Fiebre');
    });

    it('no aparece en NORMAL', () => {
      const el = mostrar({ nivel: 'NORMAL', caminoCausal: camino });

      expect(el.querySelector('.resultado__porque')).toBeNull();
    });

    it('con un backend anterior (sin texto de las preguntas) solo deja las razones', () => {
      const viejo = camino.map(({ nodoId, condicion }) => ({ nodoId, condicion }));
      const el = mostrar({ nivel: 'CONSULTAR_MEDICO', razones: ['Regla Fiebre'], caminoCausal: viejo });

      expect(component.pasosLegibles()).toEqual([]);
      expect(el.querySelector('.resultado__porque')).not.toBeNull();
      expect(el.querySelector('.resultado__camino')).toBeNull();
    });
  });

  describe('recorrido vencido', () => {
    it('al cargar, un 410 vuelve al inicio con el aviso de vencido', () => {
      const router = TestBed.inject(Router);
      const httpMock = TestBed.inject(HttpTestingController);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);

      component.cargar();
      httpMock.match(r => r.method === 'GET')
        .forEach(req => req.flush({ mensaje: 'venció' }, { status: 410, statusText: 'Gone' }));

      expect(navegar).toHaveBeenCalledWith(['/'], { queryParams: { aviso: 'vencido' } });
      expect(component.error()).toBeNull();
    });
  });
});
