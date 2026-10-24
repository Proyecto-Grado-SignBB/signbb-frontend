import { NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Color semántico del botón según la acción que dispara. */
export type TonoBoton = 'marca' | 'calma' | 'alerta' | 'aviso' | 'neutro';

/** Estilo visual del botón: relleno, contorno o solo texto. */
export type VarianteBoton = 'relleno' | 'contorno' | 'texto';

/** Ancho del botón: ocupa todo el ancho o se ajusta al contenido. */
export type AnchoBoton = 'completo' | 'auto';

/**
 * Botón reutilizable con tono, variante y alto configurables. El contenido
 * (texto o ícono) se proyecta desde la plantilla que lo usa.
 *
 * Con `href` se dibuja como enlace con el mismo aspecto, por ejemplo para
 * llamar (`tel:123`); deshabilitado, el enlace queda sin destino.
 */
@Component({
  selector: 'app-boton',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './boton.html',
  styleUrl: './boton.scss'
})
export class BotonComponent {
  /** Color semántico; por defecto el color de marca. */
  @Input() tono: TonoBoton = 'marca';
  /** Estilo visual; por defecto relleno. */
  @Input() variante: VarianteBoton = 'relleno';
  /** Altura del botón; por defecto grande. */
  @Input() alto: 'grande' | 'mediano' | 'compacto' = 'grande';
  /** 'completo' (por defecto, ancho de mobile) o 'auto' (se ajusta al contenido, para toolbars de escritorio). */
  @Input() ancho: AnchoBoton = 'completo';
  /** Deshabilita el botón cuando es true. */
  @Input() disabled = false;
  /** Destino del enlace (`tel:`, `https:`...); si viene, el botón es un `<a>`. */
  @Input() href: string | null = null;

  /** Clases de tono, variante, alto y ancho, iguales para el botón y el enlace. */
  get clases(): string {
    return `boton boton--${this.variante} boton--${this.tono} boton--${this.alto} boton--ancho-${this.ancho}`;
  }
}
