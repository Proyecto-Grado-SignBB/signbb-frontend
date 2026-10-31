import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SesionService } from 'ui-compartida';
import { environment } from '../../../environments/environment';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../core/sesion/sesion';
import { ResumenSubgrafoDTO } from '../../models/lienzo.model';
import { PerfilComponent } from './perfil';

const ANA = { id: 7, nombre: 'Dra. Ana Médica', correo: 'a@signbb.local', rol: 'MEDICO_SUPERVISOR' as const,
  institucion: 'Fundación Canguro', activo: true };

function subgrafo(id: number, autorId: number | null, publicadoEn: string | null): ResumenSubgrafoDTO {
  return {
    id, grafoId: `grafo_${id}`, nombre: `S${id}`, categoria: 'piel', etiquetaOpcion: 'x', autor: null, autorId,
    estado: publicadoEn ? 'PUBLICADO' : 'BORRADOR', nodos: 1, actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn, comentarioRevision: null, enviadoRevisionEn: null
  };
}

describe('PerfilComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(), usuario: ANA
    }));
    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), ...proveerSesion()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(CLAVE_SESION_AUTORIA);
  });

  it('muestra la cuenta de /auth/yo y cuenta solo los subgrafos propios', () => {
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/auth/yo`).flush({ ...ANA, nombre: 'Dra. Ana María' });
    http.expectOne(`${environment.apiUrl}/autoria/subgrafos`).flush([
      subgrafo(1, 7, '2026-10-01T10:00:00Z'), subgrafo(2, 7, null),
      subgrafo(3, 9, '2026-10-02T10:00:00Z'), subgrafo(4, null, null)
    ]);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent!;
    expect(texto).toContain('Dra. Ana María');
    expect(texto).toContain('Médico supervisor');
    expect(texto).toContain('a@signbb.local');
    const stats = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.stat b')].map(b => b.textContent?.trim());
    expect(stats.slice(0, 2)).toEqual(['1', '1']);
  });

  it('cerrar en todos los dispositivos llama al back y borra la sesión', () => {
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/auth/yo`).flush(ANA);
    http.expectOne(`${environment.apiUrl}/autoria/subgrafos`).flush([]);
    fixture.detectChanges();

    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find(b => b.textContent?.trim() === 'Cerrar en todos')!;
    boton.click();
    const peticion = http.expectOne(`${environment.apiUrl}/auth/cerrar-todas`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush(null, { status: 204, statusText: 'No Content' });

    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE_SESION_AUTORIA)).toBeNull();
  });


  });
