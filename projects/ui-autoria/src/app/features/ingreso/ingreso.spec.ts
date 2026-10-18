import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Rol, SesionService } from 'ui-compartida';
import { environment } from '../../../environments/environment';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../core/sesion/sesion';
import { IngresoComponent, MENSAJE_CUENTA_FAMILIA } from './ingreso';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

function sesion(rol: Rol) {
  return {
    token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: 7, nombre: 'Dra. Ana', correo: 'a@signbb.local', rol, institucion: 'Fundación Canguro', activo: true }
  };
}

describe('IngresoComponent', () => {
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
    localStorage.removeItem(CLAVE_SESION_AUTORIA);
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
    localStorage.removeItem(CLAVE_SESION_AUTORIA);
  });

  it('con los datos correctos ingresa y vuelve a la ruta de ?volver=', async () => {
    await abrir('/ingresar?volver=%2Fsubgrafos%2F3');
    await ingresar('a@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('MEDICO'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/subgrafos/3');
    expect(TestBed.inject(SesionService).autenticado()).toBeTrue();
  });

  it('sin ?volver= lleva al tablero', async () => {
    await abrir();
    await ingresar('a@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('MEDICO_SUPERVISOR'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/subgrafos');
  });

  it('un ingreso bloqueado por intentos fallidos (429) muestra el mensaje del back', async () => {
    await abrir();
    await ingresar('a@signbb.local', 'mala');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { mensaje: 'Demasiados intentos fallidos. Vuelve a intentar en 15 minutos.', avisos: [] },
      { status: 429, statusText: 'Too Many Requests' });
    harness.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Demasiados intentos fallidos');
    expect(TestBed.inject(Router).url).toBe('/ingresar');
  });

  it('con ?motivo=sesion avisa que la sesión terminó', async () => {
    await abrir('/ingresar?motivo=sesion&volver=%2Fmis-recorridos');

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Tu sesión terminó. Ingresa de nuevo para continuar.');
    expect(TestBed.inject(Router).url).toContain('/ingresar');
  });

  it('una credencial mala muestra el error en la pantalla', async () => {
    await abrir();
    await ingresar('a@signbb.local', 'mala');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { mensaje: 'Correo o contraseña incorrectos.', avisos: [] }, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Correo o contraseña incorrectos.');
    expect(TestBed.inject(Router).url).toBe('/ingresar');
  });

  it('sin datos no llama al back', async () => {
    await abrir();
    await ingresar('', '');
    http.expectNone(`${environment.apiUrl}/auth/login`);
    expect(el.textContent).toContain('Escribe tu correo y tu contraseña.');
  });

  it('una cuenta de familia se rechaza y no queda sesión', async () => {
    await abrir();
    await ingresar('p@signbb.local', 'clave-larga');
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(sesion('PADRE'));
    harness.detectChanges();

    expect(el.textContent).toContain(MENSAJE_CUENTA_FAMILIA);
    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
  });

  it('con motivo=rol cierra la sesión y lo explica', async () => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify(sesion('PADRE')));
    await abrir('/ingresar?motivo=rol');

    expect(el.textContent).toContain(MENSAJE_CUENTA_FAMILIA);
    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
  });

  it('con una sesión de médico abierta pasa directo al tablero', async () => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify(sesion('MEDICO')));
    await abrir();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/subgrafos');
  });
});
