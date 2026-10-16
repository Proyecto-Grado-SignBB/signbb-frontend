import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { EditorReglasComponent } from './editor-reglas';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../../core/sesion/sesion';

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

  it('con el subgrafo en revisión no deja editar ni descartar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reglas/3', EditorReglasComponent);
    http.expectOne(`${BASE}/bases/3`).flush(CON_CAMBIOS);
    http
      .expectOne(`${BASE}/bases/catalogo?grafoId=grafo_fiebre`)
      .flush({ grafoId: 'grafo_fiebre', nodos: [] });
    http.expectOne(`${BASE}/subgrafos`).flush([{ id: 5, grafoId: 'grafo_fiebre', estado: 'EN_REVISION' }]);
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('retíralo de revisión desde el subgrafo');
    expect(el.querySelector<HTMLFieldSetElement>('fieldset.editor-regla')!.disabled).toBeTrue();
    expect(conTexto(el, 'Descartar cambios')!.disabled).toBeTrue();
    expect(conTexto(el, 'Ir al subgrafo')).toBeTruthy();
  });
});

describe('EditorReglasComponent: base de otro médico', () => {
  let http: HttpTestingController;

  const regla = (id: string, nombre: string) => ({
    id, nombre, descripcion: null, casos: [[{ idNodo: 'p1', respuesta: 'Hoy' }]], nivel: 'URGENCIA', nodoDestino: 'c1'
  });
  const DE_ANA = {
    ...CON_CAMBIOS, autor: 'Dra. Ana Médica', institucion: 'Fundación Canguro',
    reglas: [regla('R1', 'Primera'), regla('R2', 'Segunda')]
  };

  beforeEach(() => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 'token-de-prueba',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: 99, nombre: 'Dr. Supervisor', correo: 's@signbb.local', rol: 'MEDICO_SUPERVISOR', institucion: 'SignBB', activo: true }
    }));
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

  afterEach(() => {
    http.verify();
    localStorage.removeItem(CLAVE_SESION_AUTORIA);
  });

  it('el supervisor recorre las reglas sin poder editarlas', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reglas/3', EditorReglasComponent);
    http.expectOne(`${BASE}/bases/3`).flush(DE_ANA);
    http
      .expectOne(`${BASE}/bases/catalogo?grafoId=grafo_fiebre`)
      .flush({ grafoId: 'grafo_fiebre', nodos: [] });
    http.expectOne(`${BASE}/subgrafos`).flush([{ id: 5, grafoId: 'grafo_fiebre', estado: 'BORRADOR' }]);
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('[data-ref="aviso-ajena"]')!.textContent).toContain('Base de Dra. Ana Médica: solo su autor puede editarla');
    expect(el.querySelector<HTMLFieldSetElement>('fieldset.editor-regla')!.disabled).toBeTrue();
    expect(conTexto(el, 'Descartar cambios')!.disabled).toBeTrue();
    expect(conTexto(el, '+ Nueva regla')).toBeUndefined();

    const segunda = [...el.querySelectorAll<HTMLButtonElement>('button.regla-item')][1];
    expect(segunda.disabled).toBeFalse();
    segunda.click();
    harness.detectChanges();
    expect(el.querySelector('.id-chip')!.textContent).toContain('R2');
  });
});
