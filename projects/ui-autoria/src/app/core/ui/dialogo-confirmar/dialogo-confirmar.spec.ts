import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoConfirmarComponent } from './dialogo-confirmar';

describe('DialogoConfirmarComponent', () => {
  let fixture: ComponentFixture<DialogoConfirmarComponent>;
  let el: HTMLElement;
  let confirmados: number;
  let cancelados: number;

  function boton(texto: string): HTMLButtonElement {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === texto);
    if (!b) throw new Error(`no hay un botón "${texto}"`);
    return b;
  }

  function escape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DialogoConfirmarComponent] }).compileComponents();
    fixture = TestBed.createComponent(DialogoConfirmarComponent);
    el = fixture.nativeElement;
    confirmados = 0;
    cancelados = 0;
    fixture.componentInstance.confirmar.subscribe(() => confirmados++);
    fixture.componentInstance.cancelar.subscribe(() => cancelados++);
    fixture.componentRef.setInput('mensaje', 'Se eliminará la pregunta.');
    fixture.detectChanges();
  });

  it('confirma, cancela y se cierra con Esc', () => {
    expect(el.textContent).toContain('Se eliminará la pregunta.');
    boton('Eliminar').click();
    boton('Cancelar').click();
    escape();
    expect(confirmados).toBe(1);
    expect(cancelados).toBe(2);
  });

  it('mientras está ocupado no se puede confirmar ni cerrar', () => {
    fixture.componentRef.setInput('ocupado', true);
    fixture.detectChanges();

    boton('Eliminando…').click();
    escape();
    (el.querySelector('.backdrop') as HTMLElement).click();
    expect(confirmados).toBe(0);
    expect(cancelados).toBe(0);
  });

  it('muestra el error adentro y ofrece reintentar', () => {
    fixture.componentRef.setInput('error', 'No hay conexión con el servidor.');
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No hay conexión');
    boton('Intentar de nuevo').click();
    expect(confirmados).toBe(1);
  });
});
