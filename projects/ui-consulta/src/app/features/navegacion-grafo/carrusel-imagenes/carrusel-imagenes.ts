import { Component, Input, computed, signal } from '@angular/core';
import { urlImagen } from '../../../core/media/imagenes';

/** Cuánto hay que arrastrar (px) para pasar a la otra imagen. */
const UMBRAL_ARRASTRE = 35;

/**
 * Imágenes de apoyo de una pregunta: se pasan con el dedo o con los puntos.
 * Si la pregunta dice que tiene imágenes pero no llega ninguna (o una no se
 * puede cargar), muestra una ilustración en su lugar para no dejar un hueco.
 */
@Component({
  selector: 'app-carrusel-imagenes',
  standalone: true,
  templateUrl: './carrusel-imagenes.html',
  styleUrl: './carrusel-imagenes.scss'
})
export class CarruselImagenesComponent {
  /** Nombres o rutas de las imágenes; al cambiar, vuelve a la primera. */
  @Input() set imagenes(valor: readonly string[] | null | undefined) {
    this.fuentes.set((valor ?? []).map(urlImagen));
    this.indice.set(0);
    this.fallidas.set(new Set());
  }

  private readonly fuentes = signal<string[]>([]);
  private readonly fallidas = signal<Set<string>>(new Set());
  private inicioArrastreX = 0;

  readonly indice = signal(0);

  /** Una diapositiva por imagen; sin imágenes, una sola con la ilustración. */
  readonly diapositivas = computed<(string | null)[]>(() => {
    const fuentes = this.fuentes();
    return fuentes.length > 0 ? fuentes.map(f => (this.fallidas().has(f) ? null : f)) : [null];
  });

  readonly total = computed(() => this.diapositivas().length);

  irAImagen(i: number): void {
    this.indice.set(Math.max(0, Math.min(this.total() - 1, i)));
  }

  inicioArrastre(x: number): void {
    this.inicioArrastreX = x;
  }

  finArrastre(x: number): void {
    const delta = x - this.inicioArrastreX;
    if (delta < -UMBRAL_ARRASTRE) this.irAImagen(this.indice() + 1);
    else if (delta > UMBRAL_ARRASTRE) this.irAImagen(this.indice() - 1);
  }

  /** Una imagen no cargó (no existe o Silo no responde): se cambia por la ilustración. */
  fallo(src: string): void {
    this.fallidas.update(f => new Set(f).add(src));
  }
}
