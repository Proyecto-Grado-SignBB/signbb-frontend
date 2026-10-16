import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { EditorReglasComponent } from './editor-reglas';
import { proveerSesion } from '../../../core/sesion/sesion';

const BASE = `${environment.apiUrl}/autoria`;

/** Base publicada con cambios sin publicar: ofrece «Descartar cambios». */
const CON_CAMBIOS = {
  id: 3,
  grafoId: 'grafo_fiebre',
  nombre: 'Reglas de fiebre',
  descripcion: null,
  autor: null,
  autorId: 7,
  institucion: null,
  estado: 'CAMBIOS_SIN_PUBLICAR',
  reglas: [],
  avisos: [],
  creadoEn: '2026-10-12T00:00:00Z',
  actualizadoEn: '2026-10-12T00:00:00Z',
  publicadoEn: '2026-10-11T00:00:00Z',
  puedeDescartar: true
};

function conTexto(el: Element, texto: string): HTMLButtonElement | undefined {
  return [...el.querySelectorAll<HTMLButtonElement>('button')].find(
    b => b.textContent?.trim() === texto
  );
}

describe('EditorReglasComponent: descartar cambios', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditorReglasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'reglas/:id', component: EditorReglasComponent }]),
        ...proveerSesion()
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide confirmación y hace POST a /bases/3/descartar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reglas/3', EditorReglasComponent);
    http.expectOne(`${BASE}/bases/3`).flush(CON_CAMBIOS);
    http
      .expectOne(`${BASE}/bases/catalogo?grafoId=grafo_fiebre`)
      .flush({ grafoId: 'grafo_fiebre', nodos: [] });
    http.expectOne(`${BASE}/subgrafos`).flush([]);
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    const descartar = conTexto(el, 'Descartar cambios');
    expect(descartar).toBeTruthy();
    descartar!.click();
    harness.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar');
    expect(dialogo).toBeTruthy();
    const confirmar = conTexto(dialogo!, 'Descartar cambios');
    expect(confirmar).toBeTruthy();
    confirmar!.click();

    http
      .expectOne(r => r.method === 'POST' && r.url === `${BASE}/bases/3/descartar`)
      .flush({ ...CON_CAMBIOS, estado: 'PUBLICADO' });
    harness.detectChanges();

    expect(el.textContent).toContain('Cambios descartados');
  });
});
