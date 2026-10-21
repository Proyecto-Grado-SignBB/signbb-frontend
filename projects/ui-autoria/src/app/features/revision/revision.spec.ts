import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RevisionesStore } from '../../core/revision/revisiones.store';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../core/sesion/sesion';
import { ResumenSubgrafoDTO } from '../../models/lienzo.model';
import { ResumenBaseReglaDTO } from '../../models/regla.model';
import { RevisionComponent } from './revision';

const BASE = `${environment.apiUrl}/autoria`;

const EN_REVISION: ResumenSubgrafoDTO = {
  id: 7,
  grafoId: 'grafo_respiracion',
  nombre: 'Evaluación de Respiración y Nariz',
  categoria: 'respiracion',
  etiquetaOpcion: 'Respiración',
  autor: 'Dra. Ana Martínez',
  autorId: 8,
  estado: 'EN_REVISION',
  nodos: 6,
  actualizadoEn: '2026-10-20T10:00:00Z',
  publicadoEn: null,
  comentarioRevision: null,
  enviadoRevisionEn: '2026-10-20T10:00:00Z'
};

const PUBLICADO: ResumenSubgrafoDTO = {
  id: 9,
  grafoId: 'grafo_piel',
  nombre: 'Ictericia en la piel',
  categoria: 'piel',
  etiquetaOpcion: 'Piel u ojos amarillos',
  autor: 'Dr. Carlos Rojas',
  autorId: 10,
  estado: 'PUBLICADO',
  nodos: 4,
  actualizadoEn: '2026-10-19T10:00:00Z',
  publicadoEn: '2026-10-19T10:00:00Z',
  comentarioRevision: null,
  enviadoRevisionEn: null
};

const BASE_REGLAS: ResumenBaseReglaDTO = {
  id: 3,
  grafoId: 'grafo_respiracion',
  nombre: 'Reglas de respiración',
  descripcion: null,
  autor: 'Dra. Ana Martínez',
  autorId: 8,
  estado: 'CAMBIOS_SIN_PUBLICAR',
  reglas: 2,
  actualizadoEn: '2026-10-20T10:00:00Z',
  publicadoEn: null
};

const BASE_PUBLICADA: ResumenBaseReglaDTO = {
  id: 4,
  grafoId: 'grafo_piel',
  nombre: 'Reglas de piel',
  descripcion: null,
  autor: 'Dr. Carlos Rojas',
  autorId: 10,
  estado: 'PUBLICADO',
  reglas: 3,
  actualizadoEn: '2026-10-19T10:00:00Z',
  publicadoEn: '2026-10-19T10:00:00Z'
};

describe('RevisionComponent', () => {
  let fixture: ComponentFixture<RevisionComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  function boton(texto: string, root: ParentNode = el): HTMLButtonElement {
    const encontrado = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find(b => b.textContent?.trim().includes(texto));
    if (!encontrado) throw new Error(`no hay un botón "${texto}"`);
    return encontrado;
  }

  function cargarRespuestas(revisiones = [EN_REVISION], bases = [BASE_REGLAS, BASE_PUBLICADA], subgrafos = [EN_REVISION, PUBLICADO]): void {
    http.expectOne(`${BASE}/revisiones`).flush(revisiones);
    http.expectOne(`${BASE}/bases`).flush(bases);
    http.expectOne(`${BASE}/subgrafos`).flush(subgrafos);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 'token-de-prueba',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: 99, nombre: 'Dra. Supervisora', correo: 's@signbb.local', rol: 'MEDICO_SUPERVISOR', institucion: 'SignBB', activo: true }
    }));
    await TestBed.configureTestingModule({
      imports: [RevisionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ...proveerSesion()
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(RevisionComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    cargarRespuestas();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('muestra las revisiones pendientes con autor, categoría y base de reglas', () => {
    expect(el.textContent).toContain('Evaluación de Respiración y Nariz');
    expect(el.textContent).toContain('Dra. Ana Martínez');
    expect(el.textContent).toContain('Respiración');
    expect(el.textContent).toContain('Base de reglas');
    expect(el.textContent).toContain('6 nodos');
  });

  it('actualiza el contador del store y navega al detalle', () => {
    const store = TestBed.inject(RevisionesStore);
    expect(store.pendientes()).toBe(1);

    boton('Revisar cambios').click();

    expect(router.navigate).toHaveBeenCalledWith(['/revision', 7]);
  });

  it('cambia a Publicados y busca por nombre', () => {
    boton('Publicados').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ictericia en la piel');
    expect(el.textContent).toContain('Base de reglas · 3');
    expect(el.textContent).not.toContain('Evaluación de Respiración y Nariz');

    const buscar = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    buscar.value = 'piel';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.textContent).toContain('1 de 1');

    buscar.value = 'respiración';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.textContent).toContain('No hay subgrafos publicados que coincidan con la búsqueda.');
  });

  it('abre el detalle de un publicado en modo moderación', () => {
    boton('Publicados').click();
    fixture.detectChanges();

    boton('Ver detalle').click();

    expect(router.navigate).toHaveBeenCalledWith(['/revision', 9], { queryParams: { modo: 'publicado' } });
  });

  it('despublica un subgrafo después de confirmar y recarga la sección', () => {
    boton('Publicados').click();
    fixture.detectChanges();

    boton('Despublicar').click();
    fixture.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar')!;
    expect(dialogo.textContent).toContain('¿Despublicar «Ictericia en la piel»?');
    boton('Despublicar', dialogo).click();

    const peticion = http.expectOne(`${BASE}/subgrafos/9/despublicar`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...PUBLICADO, estado: 'BORRADOR', publicadoEn: null });

    cargarRespuestas([EN_REVISION], [BASE_REGLAS], [EN_REVISION]);
    fixture.detectChanges();

    expect(el.textContent).toContain('Se despublicó «Ictericia en la piel».');
    expect(el.textContent).toContain('Todavía no hay subgrafos publicados.');
    expect(el.querySelectorAll('.review-card').length).toBe(0);
  });
});
