import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ResumenSubgrafoDTO } from '../../../models/lienzo.model';
import { ResumenBaseReglaDTO } from '../../../models/regla.model';
import { TableroReglasComponent } from './tablero-reglas';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../../core/sesion/sesion';

const BASE = `${environment.apiUrl}/autoria`;

const base = (id: number, nombre: string, autorId: number, autor: string): ResumenBaseReglaDTO => ({
  id, grafoId: `grafo_${id}`, nombre, descripcion: null, autor, autorId, estado: 'BORRADOR', reglas: 2,
  actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn: null
});

const subgrafo = (id: number, nombre: string, autorId: number): ResumenSubgrafoDTO => ({
  id, grafoId: `grafo_${id}`, nombre, categoria: 'piel', etiquetaOpcion: nombre, autor: null, autorId,
  estado: 'BORRADOR', nodos: 1, actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn: null,
  comentarioRevision: null, enviadoRevisionEn: null
});

describe('TableroReglasComponent', () => {
  let fixture: ComponentFixture<TableroReglasComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function ingresarComo(id: number, rol: 'MEDICO' | 'MEDICO_SUPERVISOR'): void {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 'token-de-prueba',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id, nombre: 'Dr. Supervisor', correo: 's@signbb.local', rol, institucion: 'SignBB', activo: true }
    }));
  }

  function cargar(bases: ResumenBaseReglaDTO[], subgrafos: ResumenSubgrafoDTO[]): void {
    TestBed.configureTestingModule({
      imports: [TableroReglasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), ...proveerSesion()]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TableroReglasComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${BASE}/bases`).flush(bases);
    http.expectOne(`${BASE}/subgrafos`).flush(subgrafos);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.removeItem(CLAVE_SESION_AUTORIA);
  });

  it('el supervisor no ve las bases de otros médicos', () => {
    ingresarComo(99, 'MEDICO_SUPERVISOR');
    cargar([base(1, 'Mías', 99, 'Dr. Supervisor'), base(2, 'De Ana', 7, 'Dra. Ana Médica')], []);

    expect(el.querySelectorAll('.base-card').length).toBe(1);
    expect(el.textContent).toContain('Mías');
    expect(el.textContent).not.toContain('De Ana');
    expect(el.querySelector('.seccion-otros')).toBeNull();
    expect(el.textContent).not.toContain('De otros médicos');
  });

  it('una base nueva solo se puede asociar a los subgrafos propios', () => {
    ingresarComo(99, 'MEDICO_SUPERVISOR');
    cargar([], [subgrafo(1, 'Fiebre', 99), subgrafo(2, 'Ictericia de Ana', 7)]);

    [...el.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Crear una base'))!.click();
    fixture.detectChanges();

    const opciones = [...el.querySelectorAll('select option')].map(o => o.textContent!.trim());
    expect(opciones).toEqual(['— Elige un subgrafo —', 'Fiebre · grafo_1']);
  });

  it('un médico también ve solo sus bases', () => {
    ingresarComo(99, 'MEDICO');
    cargar([base(1, 'Mías', 99, 'Dr. Supervisor'), base(2, 'De Ana', 7, 'Dra. Ana Médica')], []);

    expect(el.querySelectorAll('.base-card').length).toBe(1);
    expect(el.textContent).toContain('Mías');
    expect(el.textContent).not.toContain('De Ana');
    expect(el.querySelector('.seccion-otros')).toBeNull();
  });
});
