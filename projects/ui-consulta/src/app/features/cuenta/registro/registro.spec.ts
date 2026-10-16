import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SesionService } from 'ui-compartida';
import { environment } from '../../../../environments/environment';
import { CLAVE_SESION_CONSULTA, proveerSesion } from '../../../core/sesion/sesion';
import { RegistroComponent } from './registro';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

const SESION_PADRE = {
  token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true }
};

describe('RegistroComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  async function abrir(url = '/registro'): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    el = harness.routeNativeElement!;
  }

  function registrar(campos: Record<string, string>): void {
    for (const [nombre, valor] of Object.entries(campos)) {
      const campo = el.querySelector<HTMLInputElement>(`input[name="${nombre}"]`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    el.querySelector('button')!.click();
    harness.detectChanges();
  }

  const completo = {
    nombre: 'Papá Uno', correo: 'p1@signbb.local', contrasena: 'clave-larga', confirmacion: 'clave-larga'
  };

  beforeEach(() => {
    localStorage.removeItem(CLAVE_SESION_CONSULTA);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'registro', component: RegistroComponent },
          { path: '**', component: DestinoComponent }
        ]),
        ...proveerSesion()
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(CLAVE_SESION_CONSULTA);
  });

  it('crea la cuenta, abre la sesión y lleva al inicio', async () => {
    await abrir();
    registrar(completo);
    const req = http.expectOne(`${environment.apiUrl}/auth/registro`);
    expect(req.request.body).toEqual({ nombre: 'Papá Uno', correo: 'p1@signbb.local', contrasena: 'clave-larga' });
    req.flush(SESION_PADRE, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(SesionService).tieneRol('PADRE')).toBeTrue();
  });

  it('las contraseñas deben coincidir', async () => {
    await abrir();
    registrar({ ...completo, confirmacion: 'otra-clave' });

    http.expectNone(`${environment.apiUrl}/auth/registro`);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('una contraseña corta se explica sin llamar al back', async () => {
    await abrir();
    registrar({ ...completo, contrasena: '1234', confirmacion: '1234' });

    http.expectNone(`${environment.apiUrl}/auth/registro`);
    expect(el.textContent).toContain('al menos 8 caracteres');
  });

  it('faltan datos', async () => {
    await abrir();
    registrar({ ...completo, nombre: '' });

    http.expectNone(`${environment.apiUrl}/auth/registro`);
    expect(el.textContent).toContain('Escribe tu nombre, tu correo y una contraseña.');
  });

  it('un 422 del back (correo repetido) se muestra en la pantalla', async () => {
    await abrir();
    registrar(completo);
    http.expectOne(`${environment.apiUrl}/auth/registro`).flush(
      { mensaje: 'Ya existe una cuenta con ese correo.', avisos: [] },
      { status: 422, statusText: 'Unprocessable Entity' });
    harness.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Ya existe una cuenta con ese correo.');
    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
  });
});
