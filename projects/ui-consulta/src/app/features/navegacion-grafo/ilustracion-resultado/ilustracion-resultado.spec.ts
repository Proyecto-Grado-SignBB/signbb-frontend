import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IlustracionResultadoComponent } from './ilustracion-resultado';

describe('IlustracionResultadoComponent', () => {
  let fixture: ComponentFixture<IlustracionResultadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IlustracionResultadoComponent] }).compileComponents();
    fixture = TestBed.createComponent(IlustracionResultadoComponent);
  });

  function dibujar(nivel: string | null | undefined): HTMLElement {
    fixture.componentInstance.nivel = nivel;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('NORMAL dibuja la carita feliz', () => {
    expect(dibujar('NORMAL').querySelector('.ilu--feliz')).not.toBeNull();
  });

  it('CONSULTAR_MEDICO dibuja el médico', () => {
    expect(dibujar('CONSULTAR_MEDICO').querySelector('.ilu--medico')).not.toBeNull();
  });

  it('URGENCIA dibuja el hospital', () => {
    expect(dibujar('URGENCIA').querySelector('.ilu--hospital')).not.toBeNull();
  });

  it('sin nivel conocido dibuja la carita feliz, como el resto de la pantalla', () => {
    expect(dibujar(undefined).querySelector('.ilu--feliz')).not.toBeNull();
  });

  it('cada ilustración dibuja un solo svg decorativo', () => {
    const svgs = dibujar('URGENCIA').querySelectorAll('svg');

    expect(svgs.length).toBe(1);
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
  });
});
