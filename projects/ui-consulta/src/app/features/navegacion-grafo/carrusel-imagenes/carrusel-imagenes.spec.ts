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

  it('con una sola imagen no muestra contador, puntos ni la ayuda para deslizar', () => {
    mostrar(['aaa.png']);

    expect(el.querySelectorAll('.carrusel__imagen').length).toBe(1);
    expect(el.querySelector('.carrusel__contador')).toBeNull();
    expect(el.querySelector('.carrusel__punto')).toBeNull();
    expect(el.querySelector('.carrusel__ayuda')).toBeNull();
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

  it('un movimiento corto no cambia de imagen', () => {
    mostrar(['a.png', 'b.png']);
    fixture.componentInstance.inicioArrastre(100);
    fixture.componentInstance.finArrastre(80);
    expect(fixture.componentInstance.indice()).toBe(0);
  });

  it('los puntos llevan a esa imagen', () => {
    mostrar(['a.png', 'b.png', 'c.png']);

    el.querySelectorAll<HTMLElement>('.carrusel__punto')[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.indice()).toBe(2);
    expect(el.querySelector('.carrusel__contador')?.textContent).toContain('3 / 3');
  });

  it('al cambiar de pregunta vuelve a la primera imagen', () => {
    mostrar(['a.png', 'b.png']);
    fixture.componentInstance.irAImagen(1);

    mostrar(['c.png', 'd.png']);

    expect(fixture.componentInstance.indice()).toBe(0);
  });

  it('si una imagen no carga, en su lugar queda la ilustración', () => {
    mostrar(['a.png', 'b.png']);

    el.querySelectorAll<HTMLImageElement>('.carrusel__imagen')[0].dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(el.querySelectorAll('.carrusel__imagen').length).toBe(1);
    expect(el.querySelectorAll('.carrusel__slide svg').length).toBe(1);
  });

  it('si la pregunta dice que tiene imágenes pero no llega ninguna, muestra la ilustración', () => {
    mostrar([]);

    expect(el.querySelector('.carrusel__imagen')).toBeNull();
    expect(el.querySelectorAll('.carrusel__slide svg').length).toBe(1);
  });
});
