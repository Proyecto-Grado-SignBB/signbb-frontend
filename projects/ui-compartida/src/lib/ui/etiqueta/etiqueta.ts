import { Component, Input } from '@angular/core';

/** Color semántico de la etiqueta. */
export type TonoEtiqueta = 'marca' | 'calma' | 'alerta' | 'aviso';

/** Etiqueta pequeña para clasificar o marcar contenido. */
@Component({
  selector: 'app-etiqueta',
  standalone: true,
  templateUrl: './etiqueta.html',
  styleUrl: './etiqueta.scss'
})
export class EtiquetaComponent {
  /** Color semántico; por defecto el color de marca. */
  @Input() tono: TonoEtiqueta = 'marca';
}