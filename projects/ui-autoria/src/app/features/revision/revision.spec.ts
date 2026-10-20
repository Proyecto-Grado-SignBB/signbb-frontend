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
const SIN_AUTOR: ResumenSubgrafoDTO = {
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

describe('RevisionComponent', () => {
  let fixture: ComponentFixture<RevisionComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function boton(texto: string): HTMLButtonElement {
    const encontrado = [...el.querySelectorAll<HTMLButtonElement>('button')]
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
      imports: [RevisionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ...proveerSesion()
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RevisionComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${BASE}/revisiones`).flush([SIN_AUTOR]);
    http.expectOne(`${BASE}/bases`).flush([BASE_REGLAS]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('muestra autor, categoría y que hay base de reglas', () => {
    expect(el.textContent).toContain('Evaluación de Respiración y Nariz');
    expect(el.textContent).toContain('Dra. Ana Martínez');
    expect(el.textContent).toContain('Respiración');
    expect(el.textContent).toContain('Base de reglas');
    expect(el.textContent).toContain('6 nodos');
  });

  it('actualiza el contador del store y navega al detalle', () => {
    const store = TestBed.inject(RevisionesStore);
    expect(store.pendientes()).toBe(1);

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    boton('Revisar cambios').click();

    expect(router.navigate).toHaveBeenCalledWith(['/revision', 7]);
  });
});
