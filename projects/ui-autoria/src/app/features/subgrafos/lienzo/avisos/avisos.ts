import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Aviso } from '../../../../models/lienzo.model';

/**
 * Lista de avisos del lienzo, tal como los calcula el backend. Los
 * bloqueantes van primero; al tocar uno, el lienzo resalta el nodo o el "+"
 * al que se refiere.
 */
@Component({
  selector: 'app-avisos',
  standalone: true,
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss'
})
export class AvisosComponent {
  /** Avisos del lienzo. */
  @Input() avisos: Aviso[] = [];
  /** Emite el aviso tocado, para resaltar el nodo al que se refiere. */
  @Output() seleccionar = new EventEmitter<Aviso>();

  /** Avisos ordenados con los bloqueantes primero. */
  protected get ordenados(): Aviso[] {
    return [...this.avisos].sort((a, b) => Number(b.bloqueante) - Number(a.bloqueante));
  }

  /** Cantidad de avisos que impiden publicar. */
  protected get bloqueantes(): number {
    return this.avisos.filter(a => a.bloqueante).length;
  }
}
