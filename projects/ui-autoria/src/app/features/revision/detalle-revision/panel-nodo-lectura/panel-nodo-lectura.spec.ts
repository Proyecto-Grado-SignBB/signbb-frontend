import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { NodoLienzo } from '../../../../models/lienzo.model';
import { PanelNodoLecturaComponent } from './panel-nodo-lectura';

const IMAGEN = '11111111-1111-1111-1111-111111111111.png';

const PREGUNTA: NodoLienzo = {
  id: 'q1', tipo: 'PREGUNTA', texto: '¿Observa algún signo de alarma?', variasRespuestas: true, desenlace: null,
  respuestas: [
    { id: 'r1', texto: 'Quejido al respirar', gravedad: 'GRAVE', destino: 'c1' },
    { id: 'r2', texto: 'Ninguno', gravedad: 'LEVE', destino: null }
  ]
};

const CONCLUSION: NodoLienzo = {
  id: 'c1', tipo: 'CONCLUSION', texto: 'Lleve al bebé a urgencias ahora.', variasRespuestas: false,
  desenlace: 'URGENCIA', respuestas: []
};

describe('PanelNodoLecturaComponent', () => {
  let fixture: ComponentFixture<PanelNodoLecturaComponent>;
  let el: HTMLElement;

  async function abrir(nodo: NodoLienzo, inicio: string | null = 'q1'): Promise<void> {
    fixture.componentRef.setInput('nodo', nodo);
    fixture.componentRef.setInput('inicio', inicio);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelNodoLecturaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(PanelNodoLecturaComponent);
    el = fixture.nativeElement;
  });

  it('muestra la pregunta, sus respuestas y la gravedad, sin destinos', async () => {
    await abrir(PREGUNTA);

    expect(el.querySelector('.panel-head h4')?.textContent).toContain('Primera pregunta');
    expect(el.textContent).toContain('¿Observa algún signo de alarma?');
    expect(el.textContent).toContain('Permite marcar varias respuestas.');
    expect(el.querySelectorAll('.respuesta').length).toBe(2);
    expect(el.querySelector('.punto--GRAVE')).toBeTruthy();
    expect(el.textContent).toContain('Quejido al respirar');
    expect(el.textContent).not.toContain('c1');
    expect(el.textContent).not.toContain('→');
  });

  it('muestra una conclusión con su desenlace y su mensaje', async () => {
    await abrir(CONCLUSION);

    expect(el.querySelector('.panel-head h4')?.textContent).toContain('Conclusión');
    expect(el.querySelector('.desenlace--URGENCIA')?.textContent).toContain('Ir a urgencias');
    expect(el.textContent).toContain('Lleve al bebé a urgencias ahora.');
    expect(el.querySelectorAll('.respuesta').length).toBe(0);
  });

  it('muestra las imágenes de apoyo de la pregunta', async () => {
    const http = TestBed.inject(HttpTestingController);
    await abrir({ ...PREGUNTA, imagenes: [IMAGEN] });

    http.expectOne(`${environment.apiUrl}/autoria/imagenes/${IMAGEN}`)
      .flush(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    fixture.detectChanges();

    const imagen = el.querySelector<HTMLImageElement>('.miniatura img')!;
    expect(imagen).toBeTruthy();
    expect(imagen.src).toContain('blob:');
    expect(el.textContent).toContain('Imágenes de apoyo');
    http.verify();
  });

  it('no muestra la sección de imágenes si la pregunta no tiene', async () => {
    await abrir(PREGUNTA);

    expect(el.querySelector('.miniaturas')).toBeNull();
  });

  it('emite cerrar al pulsar la X', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrar.subscribe(() => (cerrado = true));
    await abrir(PREGUNTA);

    el.querySelector<HTMLButtonElement>('.btn-cerrar')!.click();

    expect(cerrado).toBeTrue();
  });
});
