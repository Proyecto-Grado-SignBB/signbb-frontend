import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDatosComponent } from './modal-datos';

describe('ModalDatosComponent', () => {
  let fixture: ComponentFixture<ModalDatosComponent>;
  let el: HTMLElement;
  let guardados: unknown[];

  function boton(texto: string): HTMLButtonElement {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
    if (!b) throw new Error(`no hay un botón "${texto}"`);
    return b;
  }

  async function escribir(nombreCampo: string, valor: string): Promise<void> {
    const campo = el.querySelector<HTMLInputElement>(`input[name="${nombreCampo}"]`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalDatosComponent] }).compileComponents();
    fixture = TestBed.createComponent(ModalDatosComponent);
    fixture.componentRef.setInput('datos', { nombre: 'Ictericia', etiquetaOpcion: 'Piel u ojos amarillos' });
    guardados = [];
    fixture.componentInstance.guardar.subscribe(d => guardados.push(d));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('con datos completos guarda sin avisos', () => {
    boton('Guardar').click();

    expect(guardados).toEqual([{ nombre: 'Ictericia', etiquetaOpcion: 'Piel u ojos amarillos' }]);
    expect(el.querySelector('.falta')).toBeNull();
  });



  it('al pulsar guardar con ambos vacíos avisa los dos', async () => {
    fixture.componentInstance['nombre'] = '';
    fixture.componentInstance['etiquetaOpcion'] = '';
    boton('Guardar').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Escribe el nombre del subgrafo.');
    expect(el.textContent).toContain('Escribe cómo lo verán las familias.');
    expect(guardados).toEqual([]);
  });
});
