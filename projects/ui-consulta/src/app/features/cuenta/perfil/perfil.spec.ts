import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SesionService } from 'ui-compartida';
import { CLAVE_SESION_CONSULTA, proveerSesion } from '../../../core/sesion/sesion';
import { PerfilComponent } from './perfil';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

const SESION_PADRE = {
  token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true }
};

describe('PerfilComponent', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'perfil', component: PerfilComponent },
          { path: '**', component: DestinoComponent }
        ]),
        ...proveerSesion()
      ]
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/perfil');
    el = harness.routeNativeElement!;
  });

  afterEach(() => localStorage.removeItem(CLAVE_SESION_CONSULTA));

  it('muestra el nombre, el correo y las iniciales de la cuenta', () => {
    expect(el.textContent).toContain('Papá Uno');
    expect(el.textContent).toContain('p1@signbb.local');
    expect(el.textContent).toContain('Cuenta de familia');
    expect(el.querySelector('.perfil__avatar')?.textContent?.trim()).toBe('PU');
    expect(el.querySelector('a[href="/mis-recorridos"]')).not.toBeNull();
  });

  it('«Cerrar sesión en todos los dispositivos» llama al back, limpia la sesión y vuelve a la bienvenida', async () => {
    el.querySelector<HTMLButtonElement>('.perfil__fila--todas')!.click();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.method === 'POST' && r.url.endsWith('/auth/cerrar-todas')).flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE_SESION_CONSULTA)).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/bienvenida');
  });

  it('si el back falla al cerrar todas, conserva la sesión y avisa', async () => {
    el.querySelector<HTMLButtonElement>('.perfil__fila--todas')!.click();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(r => r.url.endsWith('/auth/cerrar-todas')).flush({ mensaje: 'x' }, { status: 500, statusText: 'Error' });
    harness.fixture.detectChanges();

    expect(TestBed.inject(SesionService).autenticado()).toBeTrue();
    expect(el.querySelector('.perfil__error')?.textContent).toContain('No se pudo cerrar la sesión en todos los dispositivos');
    expect(TestBed.inject(Router).url).toBe('/perfil');
  });

  it('permite guardar el teléfono del pediatra en la cuenta', async () => {
    await harness.fixture.whenStable();
    const input = el.querySelector<HTMLInputElement>('.perfil__pediatra input')!;
    input.value = '3001234567';
    input.dispatchEvent(new Event('input'));
    el.querySelector<HTMLButtonElement>('.perfil__pediatra button')!.click();

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/auth/yo/pediatra'));
    expect(req.request.body).toEqual({ telefono: '3001234567' });
    req.flush({ ...SESION_PADRE.usuario, telefonoPediatra: '3001234567' });

    expect(TestBed.inject(SesionService).usuario()?.telefonoPediatra).toBe('3001234567');
  });

  it('«Cerrar sesión» limpia la sesión y vuelve a la bienvenida', async () => {
    el.querySelector<HTMLButtonElement>('.perfil__fila--salir')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE_SESION_CONSULTA)).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/bienvenida');
  });
});
