import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Categoria, ResumenSubgrafoDTO } from '../../../models/lienzo.model';
import { TableroComponent } from './tablero';

const BASE = `${environment.apiUrl}/autoria`;

const PIEL: Categoria = { puenteId: 'puente_piel', nombre: 'piel', pregunta: '¿Qué cambio observa en la piel o los ojos del bebé?' };

const BORRADOR: ResumenSubgrafoDTO = {
  id: 7, grafoId: 'grafo_ictericia_en_la_piel', nombre: 'Ictericia en la piel', categoria: 'piel',
  etiquetaOpcion: 'Piel u ojos amarillos', autor: null, estado: 'BORRADOR', nodos: 0,
  actualizadoEn: '2026-10-10T10:00:00Z', publicadoEn: null
};

describe('TableroComponent', () => {
  let fixture: ComponentFixture<TableroComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function boton(texto: string): HTMLButtonElement {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
    if (!b) throw new Error(`no hay un botón "${texto}"`);
    return b;
  }

  async function escribir(placeholder: string, valor: string): Promise<void> {
    const campo = el.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TableroComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${BASE}/subgrafos`).flush([BORRADOR]);
    http.expectOne(`${BASE}/categorias`).flush([PIEL]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('no deja crear sin nombre para la familia y explica qué escribir', async () => {
    boton('+ Nuevo subgrafo').click();
    fixture.detectChanges();
    await escribir('Ej: Ictericia en la piel', 'Ictericia en la piel');
    boton('Piel').click();
    await escribir('Ej: Piel u ojos amarillos', '  ');

    expect(el.textContent).toContain('sin términos médicos');
    expect(el.textContent).toContain('Escribe cómo lo verán las familias.');

    boton('Crear y abrir el lienzo').click();
    fixture.detectChanges();
    http.expectNone(`${BASE}/subgrafos`);

    await escribir('Ej: Piel u ojos amarillos', 'Piel u ojos amarillos');
    expect(el.textContent).not.toContain('Escribe cómo lo verán las familias.');
  });

  it('sin nombre del subgrafo lo explica y no crea nada', async () => {
    boton('+ Nuevo subgrafo').click();
    fixture.detectChanges();
    boton('Piel').click();
    await escribir('Ej: Piel u ojos amarillos', 'Piel u ojos amarillos');
    await escribir('Ej: Ictericia en la piel', '  ');

    expect(el.textContent).toContain('Escribe el nombre del subgrafo.');
    boton('Crear y abrir el lienzo').click();
    fixture.detectChanges();
    http.expectNone(`${BASE}/subgrafos`);

    await escribir('Ej: Ictericia en la piel', 'Ictericia en la piel');
    expect(el.textContent).not.toContain('Escribe el nombre del subgrafo.');
  });

  it('sin categoría lo explica al intentar crear y deja de avisar al elegirla', async () => {
    boton('+ Nuevo subgrafo').click();
    fixture.detectChanges();
    await escribir('Ej: Ictericia en la piel', 'Ictericia en la piel');
    await escribir('Ej: Piel u ojos amarillos', 'Piel u ojos amarillos');
    expect(el.textContent).not.toContain('Elige una categoría.');

    boton('Crear y abrir el lienzo').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Elige una categoría.');
    http.expectNone(`${BASE}/subgrafos`);

    boton('Piel').click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Elige una categoría.');
  });

  it('al pulsar crear con todo vacío explica cada cosa que falta', () => {
    boton('+ Nuevo subgrafo').click();
    fixture.detectChanges();
    boton('Crear y abrir el lienzo').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Escribe el nombre del subgrafo.');
    expect(el.textContent).toContain('Elige una categoría.');
    expect(el.textContent).toContain('Escribe cómo lo verán las familias.');
    http.expectNone(`${BASE}/subgrafos`);
  });

  it('eliminar pide confirmación en la interfaz, no en el navegador', () => {
    const confirmNativo = spyOn(window, 'confirm');
    boton('Eliminar').click();
    fixture.detectChanges();

    expect(confirmNativo).not.toHaveBeenCalled();
    expect(el.querySelector('app-dialogo-confirmar')?.textContent).toContain('Ictericia en la piel');

    boton('Eliminar borrador').click();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${BASE}/subgrafos/7`).flush(null);
    http.expectOne(`${BASE}/subgrafos`).flush([]);
    fixture.detectChanges();

    expect(el.querySelector('app-dialogo-confirmar')).toBeNull();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Se eliminó el borrador');
  });

  it('si eliminar falla, el error queda dentro del diálogo', () => {
    boton('Eliminar').click();
    fixture.detectChanges();
    boton('Eliminar borrador').click();
    http.expectOne(`${BASE}/subgrafos/7`).flush(null, { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar');
    expect(dialogo?.querySelector('[role="alert"]')?.textContent).toContain('No hay conexión');
    expect(el.querySelector('.content > app-mensaje-error')).toBeNull();
  });
});
