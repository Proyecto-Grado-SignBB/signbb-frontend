import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Rol, SesionService } from 'ui-compartida';
import { environment } from '../../../../environments/environment';
import { CLAVE_SESION_CONSULTA, MENSAJE_CUENTA_CLINICA, proveerSesion } from '../../../core/sesion/sesion';
import { IngresoComponent } from './ingreso';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

function sesion(rol: Rol) {
  return {
    token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol, institucion: null, activo: true }
  };
}

describe('IngresoComponent (consulta)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  async function abrir(url = '/ingresar'): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    el = harness.routeNativeElement!;
  }

  async function ingresar(correo: string, clave: string): Promise<void> {
    for (const [nombre, valor] of [['correo', correo], ['contrasena', clave]]) {
      const campo = el.querySelector<HTMLInputElement>(`input[name="${nombre}"]`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    el.querySelector('button')!.click();
    harness.detectChanges();
  }

  beforeEach(() => {
    localStorage.removeItem(CLAVE_SESION_CONSULTA);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'ingresar', component: IngresoComponent },
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

  it('con los datos correctos ingresa y vuelve a la ruta de ?volver=', async () => {
    await abrir('/ingresar?volver=%2Fresultado%2Fr1');
    await ingresar('p1@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('PADRE'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/resultado/r1');
    expect(TestBed.inject(SesionService).autenticado()).toBeTrue();
  });

  it('un ?volver= externo se ignora y lleva al inicio', async () => {
    await abrir('/ingresar?volver=https%3A%2F%2Fotro.sitio');
    await ingresar('p1@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('PADRE'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('una credencial mala muestra el error en la pantalla', async () => {
    await abrir();
    await ingresar('p1@signbb.local', 'mala');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { mensaje: 'Correo o contraseña incorrectos.', avisos: [] }, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Correo o contraseña incorrectos.');
    expect(TestBed.inject(Router).url).toBe('/ingresar');
  });

  it('una cuenta de médico se rechaza y no queda sesión', async () => {
    await abrir();
    await ingresar('a@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('MEDICO'));
    harness.detectChanges();

    expect(el.textContent).toContain(MENSAJE_CUENTA_CLINICA);
    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
  });

  it('con motivo=rol cierra la sesión y lo explica', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(sesion('MEDICO')));
    await abrir('/ingresar?motivo=rol');

    expect(el.textContent).toContain(MENSAJE_CUENTA_CLINICA);
    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
  });

  it('«Crear cuenta» conserva ?volver=', async () => {
    await abrir('/ingresar?volver=%2Fmis-recorridos');
    const enlace = el.querySelector<HTMLAnchorElement>('a[href^="/registro"]')!;

    expect(enlace.getAttribute('href')).toBe('/registro?volver=%2Fmis-recorridos');
  });
});
