import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { NodoLienzo, NodoRequest } from '../../../../models/lienzo.model';
import { ContextoPanel, PanelNodoComponent } from './panel-nodo';

const TERMOMETRO: NodoLienzo = {
  id: 'pregunta_1', tipo: 'PREGUNTA', texto: '¿Cuánto marca el termómetro?', variasRespuestas: false, desenlace: null,
  respuestas: [
    { id: 'r_2', texto: 'Menos de 38 °C', gravedad: 'LEVE', destino: null },
    { id: 'r_3', texto: 'Más de 39 °C', gravedad: 'GRAVE', destino: 'conclusion_4' }
  ]
};

describe('PanelNodoComponent', () => {
  let fixture: ComponentFixture<PanelNodoComponent>;
  let el: HTMLElement;

  async function abrir(contexto: ContextoPanel, preguntas: NodoLienzo[] = [TERMOMETRO]): Promise<void> {
    fixture.componentRef.setInput('contexto', contexto);
    fixture.componentRef.setInput('preguntas', preguntas);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function escribir(selector: string, valor: string, indice = 0): Promise<void> {
    const campo = el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)[indice];
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
    if (!b) throw new Error(`no hay un botón "${texto}"`);
    return b;
  }

  function enviar(): void {
    el.querySelector<HTMLElement>('.panel-foot app-boton:last-of-type button')!.click();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelNodoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(PanelNodoComponent);
    el = fixture.nativeElement;
  });

  it('después de un "+" crea una pregunta conectada a esa respuesta', async () => {
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] });
    expect(el.querySelector('.contexto')?.textContent).toContain('Menos de 38 °C');

    let emitido: NodoRequest | undefined;
    fixture.componentInstance.crear.subscribe(r => (emitido = r));

    await escribir('textarea', '¿Está decaído o no quiere comer?');
    await escribir('.respuesta input', 'Sí', 0);
    el.querySelectorAll<HTMLButtonElement>('.respuesta')[0].querySelector<HTMLButtonElement>('.luz--MODERADA')!.click();
    await escribir('.respuesta input', 'No', 1);
    fixture.detectChanges();
    enviar();

    expect(emitido).toEqual({
      texto: '¿Está decaído o no quiere comer?',
      variasRespuestas: false,
      imagenes: [],
      respuestas: [
        { id: null, texto: 'Sí', gravedad: 'MODERADA' },
        { id: null, texto: 'No', gravedad: 'LEVE' }
      ],
      tipo: 'PREGUNTA',
      despuesDe: { nodoId: 'pregunta_1', respuestaId: 'r_2' }
    });
  });

  it('una conclusión necesita desenlace y mensaje', async () => {
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] });
    let emitido: NodoRequest | undefined;
    fixture.componentInstance.crear.subscribe(r => (emitido = r));

    boton('Conclusión').click();
    fixture.detectChanges();
    await escribir('textarea', 'Dele líquidos y vuelva a medir en una hora.');
    enviar();
    expect(emitido).toBeUndefined();

    boton('Recomendación').click();
    fixture.detectChanges();
    enviar();
    expect(emitido?.tipo).toBe('CONCLUSION');
    expect(emitido?.desenlace).toBe('RECOMENDACION');
  });

  it('"Pregunta existente" no ofrece la misma pregunta y emite el enlace', async () => {
    const otra: NodoLienzo = { ...TERMOMETRO, id: 'pregunta_6', texto: '¿Está decaído?', respuestas: [] };
    await abrir({ tipo: 'mas', origen: TERMOMETRO, respuesta: TERMOMETRO.respuestas[0] }, [TERMOMETRO, otra]);
    let enlace: { respuestaId: string; nodoId: string | null } | undefined;
    fixture.componentInstance.enlazar.subscribe(e => (enlace = e));

    boton('Pregunta existente').click();
    fixture.detectChanges();
    const select = el.querySelector('select')!;
    const opciones = [...select.options].map(o => o.textContent?.trim());
    expect(opciones).not.toContain('¿Cuánto marca el termómetro?');

    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    enviar();
    expect(enlace).toEqual({ respuestaId: 'r_2', nodoId: 'pregunta_6' });
  });

  it('al editar conserva el id de cada respuesta (y así su destino)', async () => {
    await abrir({ tipo: 'editar', nodo: TERMOMETRO });
    let guardado: { nodoId: string; request: NodoRequest } | undefined;
    fixture.componentInstance.guardar.subscribe(g => (guardado = g));

    expect(el.querySelector('.segmentado')).toBeNull();
    await escribir('.respuesta input', 'Más de 39,5 °C', 1);
    enviar();

    expect(guardado?.nodoId).toBe('pregunta_1');
    expect(guardado?.request.respuestas).toEqual([
      { id: 'r_2', texto: 'Menos de 38 °C', gravedad: 'LEVE' },
      { id: 'r_3', texto: 'Más de 39,5 °C', gravedad: 'GRAVE' }
    ]);
    expect(guardado?.request.tipo).toBeUndefined();
  });

  describe('imágenes de apoyo', () => {
    const IMG_1 = '11111111-1111-1111-1111-111111111111.png';
    const IMG_2 = '22222222-2222-2222-2222-222222222222.jpg';
    const CON_IMAGENES: NodoLienzo = { ...TERMOMETRO, imagenes: [IMG_1, IMG_2] };

    function elegirArchivo(archivo: File): void {
      const entrada = el.querySelector<HTMLInputElement>('.agregar-imagen input')!;
      const dt = new DataTransfer();
      dt.items.add(archivo);
      entrada.files = dt.files;
      entrada.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    it('al editar muestra las imágenes que ya tiene la pregunta', async () => {
      await abrir({ tipo: 'editar', nodo: CON_IMAGENES });

      const fotos = [...el.querySelectorAll<HTMLImageElement>('.miniatura img')];
      expect(fotos.length).toBe(2);
      expect(fotos[0].src).toContain(`/media/${IMG_1}`);
      expect(fotos[0].getAttribute('alt')).toBe('');
      expect(el.querySelector('.agregar-imagen')).not.toBeNull();
    });

    it('con tres imágenes ya no ofrece agregar otra', async () => {
      await abrir({ tipo: 'editar', nodo: { ...TERMOMETRO, imagenes: [IMG_1, IMG_2, '33333333-3333-3333-3333-333333333333.webp'] } });

      expect(el.querySelectorAll('.miniatura').length).toBe(3);
      expect(el.querySelector('.agregar-imagen')).toBeNull();
    });

    it('quitar una imagen la saca de lo que se guarda', async () => {
      await abrir({ tipo: 'editar', nodo: CON_IMAGENES });
      let guardado: { nodoId: string; request: NodoRequest } | undefined;
      fixture.componentInstance.guardar.subscribe(g => (guardado = g));

      el.querySelector<HTMLButtonElement>('.btn-quitar-imagen')!.click();
      fixture.detectChanges();
      enviar();

      expect(guardado?.request.imagenes).toEqual([IMG_2]);
    });

    it('sube la imagen elegida y la agrega a la pregunta', async () => {
      const http = TestBed.inject(HttpTestingController);
      await abrir({ tipo: 'editar', nodo: TERMOMETRO });
      let guardado: { nodoId: string; request: NodoRequest } | undefined;
      fixture.componentInstance.guardar.subscribe(g => (guardado = g));

      elegirArchivo(new File([new Uint8Array(10)], 'termometro.png', { type: 'image/png' }));
      const subida = http.expectOne(`${environment.apiUrl}/autoria/imagenes`);
      expect(el.querySelector('.agregar-imagen')?.textContent).toContain('Subiendo');
      subida.flush({ nombre: IMG_1 });
      fixture.detectChanges();

      expect(el.querySelectorAll('.miniatura').length).toBe(1);
      enviar();
      expect(guardado?.request.imagenes).toEqual([IMG_1]);
      http.verify();
    });

    it('no sube lo que pesa más de 1 MB ni lo que no es imagen, y explica por qué', async () => {
      const http = TestBed.inject(HttpTestingController);
      await abrir({ tipo: 'editar', nodo: TERMOMETRO });

      elegirArchivo(new File([new Uint8Array(1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }));
      expect(el.querySelector('.error')?.textContent).toContain('máximo es 1 MB');

      elegirArchivo(new File(['hola'], 'nota.txt', { type: 'text/plain' }));
      expect(el.querySelector('.error')?.textContent).toContain('png, jpeg, webp o gif');

      http.expectNone(`${environment.apiUrl}/autoria/imagenes`);
      expect(el.querySelectorAll('.miniatura').length).toBe(0);
    });

    it('si el servidor rechaza la imagen muestra su mensaje', async () => {
      const http = TestBed.inject(HttpTestingController);
      await abrir({ tipo: 'editar', nodo: TERMOMETRO });

      elegirArchivo(new File([new Uint8Array(10)], 'x.png', { type: 'image/png' }));
      http.expectOne(`${environment.apiUrl}/autoria/imagenes`)
        .flush({ mensaje: 'Solo se aceptan imágenes png, jpeg, webp o gif.', avisos: [] }, { status: 422, statusText: 'Unprocessable' });
      fixture.detectChanges();

      expect(el.querySelector('.error')?.textContent).toContain('Solo se aceptan imágenes');
      expect(el.querySelectorAll('.miniatura').length).toBe(0);
    });

    it('una pregunta nueva sale con la lista de imágenes vacía', async () => {
      await abrir({ tipo: 'primera' });
      let creado: NodoRequest | undefined;
      fixture.componentInstance.crear.subscribe(r => (creado = r));
      await escribir('textarea', '¿Fiebre?');
      enviar();
      expect(creado?.imagenes).toEqual([]);
    });
  });
});
