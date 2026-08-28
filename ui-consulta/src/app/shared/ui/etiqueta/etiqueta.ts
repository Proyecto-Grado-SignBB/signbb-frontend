import { Component, Input } from '@angular/core';

export type TonoEtiqueta = 'marca' | 'calma';

@Component({
  selector: 'app-etiqueta',
  standalone: true,
  templateUrl: './etiqueta.html',
  styleUrl: './etiqueta.scss'
})
export class EtiquetaComponent {
  @Input() tono: TonoEtiqueta = 'marca';
}