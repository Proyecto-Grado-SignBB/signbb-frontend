import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { SubgrafoDTO } from '../../../models/lienzo.model';
import { LienzoComponent } from './lienzo';

const BASE = `${environment.apiUrl}/autoria`;

describe('LienzoComponent: dirección con un subgrafo que no existe', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LienzoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'subgrafos/:id', component: LienzoComponent }])
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function abrir(id: string): Promise<HTMLElement> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/subgrafos/${id}`, LienzoComponent);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  for (const id of ['abc', '0', '-3', '1.5']) {
    it(`con la dirección "${id}" lo explica sin molestar al servidor`, async () => {
      const el = await abrir(id);

      http.expectNone(r => r.url.startsWith(`${BASE}/subgrafos`));
      expect(el.textContent).toContain('Ese subgrafo no existe.');
      expect(el.textContent).not.toContain('Cargando el lienzo');
    });
  }

  it('con un número que el servidor no tiene muestra el aviso de que ya no existe', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/subgrafos/99999', LienzoComponent);
    http.expectOne(`${BASE}/subgrafos/99999`).flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Ese elemento ya no existe.');
  });
});

describe('LienzoComponent: despublicar', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  const PUBLICADO: SubgrafoDTO = {
    id: 7, grafoId: 'grafo_ictericia', nombre: 'Ictericia en la piel', puenteId: 'puente_piel',
    categoria: 'piel', etiquetaOpcion: 'Piel u ojos amarillos', autor: null, institucion: null,
    estado: 'PUBLICADO', inicio: null, nodos: [], avisos: [], creadoEn: '2026-10-10T10:00:00Z',
    actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn: '2026-10-10T10:00:00Z', puedeDescartar: true
  };

  function boton(texto: string): HTMLButtonElement | undefined {
    return [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
  }

  async function abrir(subgrafo: SubgrafoDTO): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/subgrafos/7', LienzoComponent);
    http.expectOne(`${BASE}/subgrafos/7`).flush(subgrafo);
    http.expectOne(`${BASE}/categorias`).flush([]);
    http.expectOne(`${BASE}/bases`).flush([]);
    harness.detectChanges();
    el = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LienzoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'subgrafos/:id', component: LienzoComponent }])
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('un borrador que no está publicado no ofrece «Despublicar»', async () => {
    await abrir({ ...PUBLICADO, estado: 'BORRADOR', publicadoEn: null, puedeDescartar: false });

    expect(boton('Despublicar')).toBeUndefined();
  });

  it('pide confirmación y explica que los recorridos en curso terminan', async () => {
    await abrir(PUBLICADO);

    boton('Despublicar')!.click();
    harness.detectChanges();

    expect(el.textContent).toContain('Despublicar subgrafo');
    expect(el.textContent).toContain('Las que ya van por él lo terminan con normalidad');
    http.expectNone(`${BASE}/subgrafos/7/despublicar`);
  });

  it('al confirmar, el subgrafo vuelve a «Borrador» y se cierra el diálogo', async () => {
    await abrir(PUBLICADO);
    boton('Despublicar')!.click();
    harness.detectChanges();

    el.querySelector<HTMLElement>('.panel-foot app-boton:last-child button')!.click();
    const peticion = http.expectOne(`${BASE}/subgrafos/7/despublicar`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...PUBLICADO, estado: 'BORRADOR', publicadoEn: null, puedeDescartar: false });
    harness.detectChanges();

    expect(el.textContent).toContain('Borrador');
    expect(el.textContent).toContain('Despublicado');
    expect(el.querySelector('app-dialogo-confirmar')).toBeNull();
    expect(boton('Despublicar')).toBeUndefined();
  });

  it('si el servidor lo rechaza, muestra su mensaje dentro del diálogo y no cambia el estado', async () => {
    await abrir(PUBLICADO);
    boton('Despublicar')!.click();
    harness.detectChanges();

    el.querySelector<HTMLElement>('.panel-foot app-boton:last-child button')!.click();
    http.expectOne(`${BASE}/subgrafos/7/despublicar`).flush(
      { mensaje: 'Este es el único subgrafo publicado. Publica otro antes.', avisos: [] },
      { status: 422, statusText: 'Unprocessable Entity' });
    harness.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar')!;
    expect(dialogo.textContent).toContain('Este es el único subgrafo publicado. Publica otro antes.');
    expect(el.textContent).toContain('Publicado');
  });
});
