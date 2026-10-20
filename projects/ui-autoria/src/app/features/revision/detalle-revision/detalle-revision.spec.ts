import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { RevisionesStore } from '../../../core/revision/revisiones.store';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../../core/sesion/sesion';
import { SubgrafoDTO } from '../../../models/lienzo.model';
import { BaseReglaDTO, CatalogoDTO } from '../../../models/regla.model';
import { DetalleRevisionComponent } from './detalle-revision';

const BASE = `${environment.apiUrl}/autoria`;

const SUBGRAFO: SubgrafoDTO = {
  id: 7,
  grafoId: 'grafo_respiracion',
  nombre: 'Evaluación de Respiración y Nariz',
  puenteId: 'puente_respiracion',
  categoria: 'respiracion',
  etiquetaOpcion: 'Respiración',
  autor: 'Dra. Ana Martínez',
  institucion: 'Fundación Canguro',
  autorId: 8,
  estado: 'EN_REVISION',
  inicio: 'q1',
  nodos: [
    {
      id: 'q1',
      tipo: 'PREGUNTA',
      texto: '¿Observa algún signo de alarma?',
      variasRespuestas: true,
      desenlace: null,
      respuestas: [{ id: 'r1', texto: 'Quejido al respirar', gravedad: 'GRAVE', destino: 'c1' }]
    },
    {
      id: 'c1',
      tipo: 'CONCLUSION',
      texto: 'URGENCIA',
      variasRespuestas: false,
      desenlace: 'URGENCIA',
      respuestas: []
    }
  ],
  avisos: [],
  creadoEn: '2026-10-20T09:00:00Z',
  actualizadoEn: '2026-10-20T10:00:00Z',
  publicadoEn: null,
  puedeDescartar: false,
  comentarioRevision: null,
  revisadoEn: null
};

const BASE_REGLAS: BaseReglaDTO = {
  id: 3,
  grafoId: 'grafo_respiracion',
  nombre: 'Reglas de respiración',
  descripcion: null,
  autor: 'Dra. Ana Martínez',
  institucion: 'Fundación Canguro',
  autorId: 8,
  estado: 'CAMBIOS_SIN_PUBLICAR',
  reglas: [
    {
      id: 'R_RESP_URG',
      nombre: 'Regla Respiración Urgencia',
      descripcion: 'Activa urgencia.',
      casos: [[{ idNodo: 'q1', respuesta: 'Quejido al respirar' }]],
      nivel: 'URGENCIA',
      nodoDestino: 'c1'
    }
  ],
  avisos: [],
  creadoEn: '2026-10-20T09:00:00Z',
  actualizadoEn: '2026-10-20T10:00:00Z',
  publicadoEn: null,
  puedeDescartar: false
};

const CATALOGO: CatalogoDTO = {
  grafoId: 'grafo_respiracion',
  nodos: [
    { id: 'q1', texto: '¿Observa algún signo de alarma?', tipo: 'pregunta', opciones: ['Quejido al respirar'], desenlace: null },
    { id: 'c1', texto: 'URGENCIA', tipo: 'terminal', opciones: [], desenlace: 'URGENCIA' }
  ]
};

describe('DetalleRevisionComponent', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;
  let http: HttpTestingController;

  function boton(texto: string, root: ParentNode = el): HTMLButtonElement {
    const encontrado = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find(b => b.textContent?.trim().includes(texto));
    if (!encontrado) throw new Error(`no hay un botón "${texto}"`);
    return encontrado;
  }

  beforeEach(async () => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 'token-de-prueba',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: 99, nombre: 'Dra. Supervisora', correo: 's@signbb.local', rol: 'MEDICO_SUPERVISOR', institucion: 'SignBB', activo: true }
    }));
    await TestBed.configureTestingModule({
      imports: [DetalleRevisionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'revision/:id', component: DetalleRevisionComponent }]),
        ...proveerSesion()
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/revision/7', DetalleRevisionComponent);

    http.expectOne(`${BASE}/subgrafos/7`).flush(SUBGRAFO);
    http.expectOne(`${BASE}/revisiones`).flush([{
      id: 7, grafoId: SUBGRAFO.grafoId, nombre: SUBGRAFO.nombre, categoria: SUBGRAFO.categoria,
      etiquetaOpcion: SUBGRAFO.etiquetaOpcion, autor: SUBGRAFO.autor, autorId: SUBGRAFO.autorId,
      estado: 'EN_REVISION', nodos: 2, actualizadoEn: SUBGRAFO.actualizadoEn, publicadoEn: null,
      comentarioRevision: null, enviadoRevisionEn: '2026-10-20T10:00:00Z'
    }]);
    harness.detectChanges();

    http.expectOne(`${BASE}/bases`).flush([{
      id: 3, grafoId: BASE_REGLAS.grafoId, nombre: BASE_REGLAS.nombre, descripcion: null,
      autor: BASE_REGLAS.autor, autorId: BASE_REGLAS.autorId, estado: BASE_REGLAS.estado,
      reglas: 1, actualizadoEn: BASE_REGLAS.actualizadoEn, publicadoEn: null
    }]);
    harness.detectChanges();

    http.expectOne(`${BASE}/bases/3`).flush(BASE_REGLAS);
    http.expectOne(`${BASE}/bases/catalogo?grafoId=grafo_respiracion`).flush(CATALOGO);
    harness.detectChanges();
    el = harness.routeNativeElement as HTMLElement;
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('muestra el grafo y la base de reglas en dos pestañas', () => {
    expect(el.textContent).toContain('Evaluación de Respiración y Nariz');
    expect(el.textContent).toContain('Dra. Ana Martínez');
    expect(el.textContent).toContain('Ambas pestañas muestran el contenido completo');
    expect(el.querySelectorAll('.tab').length).toBe(2);
    expect(el.querySelector('app-visor-grafo')).toBeTruthy();

    boton('Base reglas').click();
    harness.detectChanges();

    expect(el.textContent).toContain('Regla Respiración Urgencia');
    expect(el.querySelector('app-visor-regla')).toBeTruthy();
  });

  it('aprueba la revisión y vuelve a la bandeja', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    boton('Aprobar y publicar').click();
    harness.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar')!;
    boton('Aprobar y publicar', dialogo).click();

    const peticion = http.expectOne(`${BASE}/subgrafos/7/aprobar`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...SUBGRAFO, estado: 'PUBLICADO' });
    harness.detectChanges();

    expect(TestBed.inject(RevisionesStore).mensaje()).toContain('Publicado');
    expect(router.navigate).toHaveBeenCalledWith(['/revision']);
  });

  it('rechaza la revisión con un comentario', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    boton('Rechazar').click();
    harness.detectChanges();

    const modal = el.querySelector('app-modal-rechazo')!;
    const comentario = modal.querySelector<HTMLTextAreaElement>('textarea')!;
    comentario.value = 'Falta explicar qué hacer si el bebé no come.';
    comentario.dispatchEvent(new Event('input'));
    harness.detectChanges();
    boton('Rechazar cambios', modal).click();

    const peticion = http.expectOne(`${BASE}/subgrafos/7/rechazar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ comentario: 'Falta explicar qué hacer si el bebé no come.' });
    peticion.flush({ ...SUBGRAFO, estado: 'BORRADOR' });
    harness.detectChanges();

    expect(TestBed.inject(RevisionesStore).mensaje()).toContain('Rechazado');
    expect(router.navigate).toHaveBeenCalledWith(['/revision']);
  });
});
