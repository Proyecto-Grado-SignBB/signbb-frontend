import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarruselImagenesComponent } from './carrusel-imagenes';

describe('CarruselImagenesComponent', () => {
  let fixture: ComponentFixture<CarruselImagenesComponent>;
  let el: HTMLElement;

  function mostrar(imagenes: string[] | undefined): void {
    fixture.componentInstance.imagenes = imagenes;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarruselImagenesComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarruselImagenesComponent);
    el = fixture.nativeElement;
  });

  it('muestra una imagen real por cada una que llega, pedida a /media', () => {
    mostrar(['aaa.png', 'bbb.jpg', 'ccc.webp']);

    const fotos = [...el.querySelectorAll<HTMLImageElement>('.carrusel__imagen')];
    expect(fotos.length).toBe(3);
    expect(fotos[0].src).toContain('/media/aaa.png');
    expect(fotos[2].src).toContain('/media/ccc.webp');
    expect(el.querySelector('.carrusel__contador')?.textContent).toContain('1 / 3');
    expect(el.querySelectorAll('.carrusel__punto').length).toBe(3);
  });


  it('desliza con el dedo y no se pasa de la primera ni de la última', () => {
    mostrar(['a.png', 'b.png']);
    const c = fixture.componentInstance;

    c.inicioArrastre(200);
    c.finArrastre(100);
    expect(c.indice()).toBe(1);

    c.inicioArrastre(200);
    c.finArrastre(100);
    expect(c.indice()).toBe(1);

    c.inicioArrastre(100);
    c.finArrastre(300);
    expect(c.indice()).toBe(0);

    c.inicioArrastre(100);
    c.finArrastre(300);
    expect(c.indice()).toBe(0);
  });




  it('si una imagen no carga, en su lugar queda la ilustración', () => {
    mostrar(['a.png', 'b.png']);

    el.querySelectorAll<HTMLImageElement>('.carrusel__imagen')[0].dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(el.querySelectorAll('.carrusel__imagen').length).toBe(1);
    expect(el.querySelectorAll('.carrusel__slide svg').length).toBe(1);
  });

  });
