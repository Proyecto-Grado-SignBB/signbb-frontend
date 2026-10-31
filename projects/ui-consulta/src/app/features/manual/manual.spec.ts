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


  });
