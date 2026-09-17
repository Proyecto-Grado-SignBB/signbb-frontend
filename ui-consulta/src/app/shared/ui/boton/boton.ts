import { Component, Input } from '@angular/core';

export type TonoBoton = 'marca' | 'calma' | 'alerta' | 'aviso' | 'neutro';
export type VarianteBoton = 'relleno' | 'contorno' | 'texto';

@Component({
  selector: 'app-boton',
  standalone: true,
  templateUrl: './boton.html',
  styleUrl: './boton.scss'
})
export class BotonComponent {
  @Input() tono: TonoBoton = 'marca';
  @Input() variante: VarianteBoton = 'relleno';
  @Input() alto: 'grande' | 'mediano' = 'grande';
}