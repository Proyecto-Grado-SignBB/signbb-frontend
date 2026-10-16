import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CLAVE_SESION_CONSULTA, proveerSesion } from '../../../core/sesion/sesion';
import { BienvenidaComponent } from './bienvenida';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

const SESION_PADRE = {
  token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true }
};

describe('BienvenidaComponent', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  async function abrir(): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/bienvenida');
    el = harness.routeNativeElement!;
  }

  beforeEach(() => {
    localStorage.removeItem(CLAVE_SESION_CONSULTA);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'bienvenida', component: BienvenidaComponent },
          { path: '**', component: DestinoComponent }
        ]),
        ...proveerSesion()
      ]
    });
  });

  afterEach(() => localStorage.removeItem(CLAVE_SESION_CONSULTA));

  it('explica la herramienta en tres pasos', async () => {
    await abrir();

    expect(el.querySelectorAll('.bienvenida__paso').length).toBe(3);
    expect(el.textContent).toContain('Recibe una recomendación clara');
  });

  it('«Crear cuenta» lleva al registro', async () => {
    await abrir();
    el.querySelector<HTMLElement>('app-boton')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/registro');
  });

  it('tiene el enlace para ingresar', async () => {
    await abrir();

    expect(el.querySelector('a[href="/ingresar"]')?.textContent).toContain('Ingresar');
  });

  it('con sesión de familia pasa directo al inicio', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await abrir();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
