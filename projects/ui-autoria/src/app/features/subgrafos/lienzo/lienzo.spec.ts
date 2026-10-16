import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { SubgrafoDTO } from '../../../models/lienzo.model';
import { LienzoComponent } from './lienzo';
import { proveerSesion } from '../../../core/sesion/sesion';

const BASE = `${environment.apiUrl}/autoria`;

describe('LienzoComponent: dirección con un subgrafo que no existe', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LienzoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'subgrafos/:id', component: LienzoComponent }]),
        ...proveerSesion()
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

describe('LienzoComponent: revisión', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  const PREGUNTA = {
    id: 'p1', tipo: 'PREGUNTA' as const, texto: '¿Desde cuándo?', variasRespuestas: false, desenlace: null,
    imagenes: [], respuestas: [{ id: 'r1', texto: 'Hoy', gravedad: 'LEVE' as const, destino: null }]
  };

  const BORRADOR: SubgrafoDTO = {
    id: 7, grafoId: 'grafo_ictericia', nombre: 'Ictericia en la piel', puenteId: 'puente_piel',
    categoria: 'piel', etiquetaOpcion: 'Piel u ojos amarillos', autor: null, institucion: null, autorId: 7,
    estado: 'BORRADOR', inicio: 'p1', nodos: [PREGUNTA], avisos: [], creadoEn: '2026-10-10T10:00:00Z',
    actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn: null, puedeDescartar: false,
    comentarioRevision: null, revisadoEn: null
  };
  const EN_REVISION: SubgrafoDTO = { ...BORRADOR, estado: 'EN_REVISION' };
  const PUBLICADO: SubgrafoDTO = { ...BORRADOR, estado: 'PUBLICADO', publicadoEn: '2026-10-11T10:00:00Z' };

  function boton(texto: string): HTMLButtonElement | undefined {
    return [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
  }

  async function abrir(subgrafo: SubgrafoDTO, bases: unknown[] = []): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/subgrafos/7', LienzoComponent);
    http.expectOne(`${BASE}/subgrafos/7`).flush(subgrafo);
    http.expectOne(`${BASE}/categorias`).flush([]);
    http.expectOne(`${BASE}/bases`).flush(bases);
    harness.detectChanges();
    el = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LienzoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'subgrafos/:id', component: LienzoComponent }]),
        ...proveerSesion()
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('«Enviar a revisión» abre la confirmación y al confirmar llama al endpoint', async () => {
    await abrir(BORRADOR);

    boton('Enviar a revisión')!.click();
    harness.detectChanges();
    expect(el.querySelector('app-modal-publicar')!.textContent).toContain('Un supervisor lo revisará');
    http.expectNone(`${BASE}/subgrafos/7/enviar-revision`);

    el.querySelector<HTMLElement>('.panel-foot app-boton:last-child button')!.click();
    const peticion = http.expectOne(`${BASE}/subgrafos/7/enviar-revision`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush(EN_REVISION);
    harness.detectChanges();

    expect(el.querySelector('app-modal-publicar')).toBeNull();
    expect(el.textContent).toContain('En revisión');
    expect(boton('Retirar de revisión')).toBeTruthy();
  });

  it('si el envío tiene avisos bloqueantes, los muestra en el modal', async () => {
    await abrir(BORRADOR);
    boton('Enviar a revisión')!.click();
    harness.detectChanges();

    el.querySelector<HTMLElement>('.panel-foot app-boton:last-child button')!.click();
    http.expectOne(`${BASE}/subgrafos/7/enviar-revision`).flush(
      {
        mensaje: 'No se pudo enviar a revisión: revisa los avisos del lienzo y de las reglas.',
        avisos: [{ codigo: 'RESPUESTA_SIN_CAMINO', mensaje: '«Hoy» no tiene camino.', bloqueante: true, nodoId: 'p1', respuestaId: 'r1' }]
      },
      { status: 422, statusText: 'Unprocessable Entity' });
    harness.detectChanges();

    const modal = el.querySelector('app-modal-publicar')!;
    expect(modal.textContent).toContain('«Hoy» no tiene camino.');
    expect(modal.textContent).toContain('No se pudo enviar a revisión');
  });

  it('en revisión el lienzo queda en solo lectura y se puede retirar', async () => {
    await abrir(EN_REVISION);

    expect(el.textContent).toContain('Mientras tanto no se puede editar');
    expect(boton('Enviar a revisión')).toBeUndefined();
    expect(boton('Editar datos')!.disabled).toBeTrue();
    expect(el.querySelector('button.mas')).toBeNull();

    el.querySelector<HTMLButtonElement>('button.nodo')!.click();
    harness.detectChanges();
    expect(el.querySelector('app-panel-nodo')).toBeNull();

    boton('Retirar de revisión')!.click();
    const peticion = http.expectOne(`${BASE}/subgrafos/7/retirar-revision`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush(BORRADOR);
    harness.detectChanges();

    expect(boton('Enviar a revisión')).toBeTruthy();
    expect(el.querySelector('button.mas')).toBeTruthy();
  });

  it('si el supervisor lo rechazó, muestra su comentario', async () => {
    await abrir({ ...BORRADOR, comentarioRevision: 'Agrega qué hacer si el bebé no come.' });

    const aviso = el.querySelector('.comentario-revision')!;
    expect(aviso.textContent).toContain('El supervisor pidió cambios');
    expect(aviso.textContent).toContain('Agrega qué hacer si el bebé no come.');
  });

  it('ya no ofrece «Despublicar» ni deja enviar lo que ya está publicado', async () => {
    await abrir(PUBLICADO, [{ id: 3, grafoId: 'grafo_ictericia', estado: 'PUBLICADO' }]);

    expect(boton('Despublicar')).toBeUndefined();
    expect(boton('Publicado')!.disabled).toBeTrue();
  });

  it('publicado pero con reglas sin publicar, sí deja enviar a revisión', async () => {
    await abrir(PUBLICADO, [{ id: 3, grafoId: 'grafo_ictericia', estado: 'CAMBIOS_SIN_PUBLICAR' }]);

    expect(boton('Enviar a revisión')!.disabled).toBeFalse();
    expect(boton('Despublicar')).toBeUndefined();
  });
});
