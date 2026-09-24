import { Component, Input } from '@angular/core';

export type TonoBoton = 'marca' | 'calma' | 'alerta' | 'aviso' | 'neutro';
export type VarianteBoton = 'relleno' | 'contorno' | 'texto';
export type AnchoBoton = 'completo' | 'auto';

@Component({
  selector: 'app-boton',
  standalone: true,
  templateUrl: './boton.html',
  styleUrl: './boton.scss'
})
export class BotonComponent {
  @Input() tono: TonoBoton = 'marca';
  @Input() variante: VarianteBoton = 'relleno';
  @Input() alto: 'grande' | 'mediano' | 'compacto' = 'grande';
  /** 'completo' (por defecto, ancho de mobile) o 'auto' (se ajusta al contenido, para toolbars de escritorio). */
  @Input() ancho: AnchoBoton = 'completo';
  @Input() disabled = false;
}
