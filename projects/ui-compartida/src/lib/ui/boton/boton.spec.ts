import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotonComponent } from './boton';

@Component({
  standalone: true,
  imports: [BotonComponent],
  template: `<app-boton [href]="href" [disabled]="disabled" tono="alerta">Llamar</app-boton>`
})
class AnfitrionComponent {
  href: string | null = null;
  disabled = false;
}

describe('Boton', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnfitrionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  function raiz(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('sin href es un botón con el contenido proyectado', () => {
    const boton = raiz().querySelector('button')!;

    expect(boton.textContent?.trim()).toBe('Llamar');
    expect(boton.classList).toContain('boton--alerta');
    expect(raiz().querySelector('a')).toBeNull();
  });

  it('con href es un enlace con las mismas clases', () => {
    fixture.componentInstance.href = 'tel:123';
    fixture.detectChanges();

    const enlace = raiz().querySelector('a')!;
    expect(enlace.getAttribute('href')).toBe('tel:123');
    expect(enlace.textContent?.trim()).toBe('Llamar');
    expect(enlace.classList).toContain('boton--alerta');
    expect(raiz().querySelector('button')).toBeNull();
  });

  it('un enlace deshabilitado queda sin destino', () => {
    fixture.componentInstance.href = 'tel:123';
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    const enlace = raiz().querySelector('a')!;
    expect(enlace.hasAttribute('href')).toBeFalse();
    expect(enlace.getAttribute('aria-disabled')).toBe('true');
    expect(enlace.classList).toContain('boton--deshabilitado');
  });
});
