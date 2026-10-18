import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { proveerSesion } from '../../core/sesion/sesion';
import { ManualComponent } from './manual';

describe('ManualComponent', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: ManualComponent },
          { path: 'manual', component: ManualComponent }
        ]),
        ...proveerSesion()
      ]
    });
  });

  async function abrir(): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manual');
    el = harness.routeNativeElement!;
  }

  it('muestra las secciones del manual y las deja cerradas, menos la primera', async () => {
    await abrir();

    const secciones = Array.from(el.querySelectorAll<HTMLDetailsElement>('.manual__seccion'));
    expect(el.querySelector('h1')?.textContent).toContain('Manual de usuario');
    expect(secciones.length).toBe(6);
    expect(secciones[0].open).toBeTrue();
    expect(secciones.slice(1).every(s => !s.open)).toBeTrue();
  });

  it('explica los tres resultados con los textos de la app', async () => {
    await abrir();

    expect(el.textContent).toContain('Todo tranquilo por ahora');
    expect(el.textContent).toContain('Conviene consultar a tu médico');
    expect(el.textContent).toContain('Ve a urgencias ahora');
  });

  it('explica el dispositivo seguro (30 días) y el bloqueo por intentos', async () => {
    await abrir();

    expect(el.textContent).toContain('Este es un dispositivo seguro');
    expect(el.textContent).toContain('30 días');
    expect(el.textContent).toContain('5 veces');
    expect(el.textContent).toContain('15');
  });

  it('tiene el enlace de vuelta al inicio y el de la Fundación Canguro', async () => {
    await abrir();

    expect(el.querySelector('a[href="/"]')).not.toBeNull();
    const enlace = el.querySelector<HTMLAnchorElement>('.manual__enlace')!;
    expect(enlace.getAttribute('href')).toBe('https://fundacioncanguro.co/');
    expect(enlace.getAttribute('rel')).toContain('noopener');
  });
});
