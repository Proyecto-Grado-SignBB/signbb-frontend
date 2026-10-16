import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

  it('«Cerrar sesión» limpia la sesión y vuelve a la bienvenida', async () => {
    el.querySelector<HTMLButtonElement>('.perfil__fila--salir')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(SesionService).autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE_SESION_CONSULTA)).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/bienvenida');
  });
});
