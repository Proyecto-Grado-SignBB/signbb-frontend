import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import {
  CLAVE_SESION_CONSULTA,
  MENSAJE_RECORRIDO_NO_DISPONIBLE,
  guardFamilia,
  proveerSesion
} from '../../../core/sesion/sesion';
import { Inicio } from './inicio';

@Component({ standalone: true, template: 'destino' })
class DestinoComponent {}

const SESION_PADRE = {
  token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: { id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true }
};

describe('Inicio', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  async function abrir(url = '/'): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    el = harness.routeNativeElement!;
  }

  const cta = () => el.querySelector<HTMLButtonElement>('.inicio__cta')!;

  beforeEach(() => {
    localStorage.removeItem(CLAVE_SESION_CONSULTA);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: Inicio, canActivate: [guardFamilia] },
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

  it('sin sesión lleva a la bienvenida', async () => {
    await abrir();

    expect(TestBed.inject(Router).url).toBe('/bienvenida');
  });

  it('con sesión saluda por el nombre e inicia el recorrido', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await abrir();
    expect(el.textContent).toContain('Hola, Papá Uno');
    expect(el.querySelector('a[href="/mis-recorridos"]')).not.toBeNull();

    cta().click();
    http.expectOne(`${environment.apiUrl}/recorridos`).flush(
      { recorridoId: 'r9', estado: 'EN_CURSO', pregunta: null, resultado: null });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/pregunta/r9');
  });

  it('el perfil se abre desde el encabezado y «Cerrar sesión» ya no está en el inicio', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await abrir();

    expect(el.querySelector('a[href="/perfil"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Cerrar sesión');
  });

  it('abre el manual de usuario y ya no tiene el botón de configuración', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await abrir();

    expect(el.querySelector('a[href="/manual"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Configuración"]')).toBeNull();
  });

  it('con ?aviso=recorrido explica que ese recorrido no está disponible', async () => {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify(SESION_PADRE));
    await abrir('/?aviso=recorrido');

    expect(el.querySelector('.inicio__aviso')?.textContent).toContain(MENSAJE_RECORRIDO_NO_DISPONIBLE);
  });

  it('sin sesión, el aviso llega a la bienvenida en la URL', async () => {
    await abrir('/?aviso=recorrido');

    expect(TestBed.inject(Router).url).toBe('/bienvenida?aviso=recorrido');
  });
});
