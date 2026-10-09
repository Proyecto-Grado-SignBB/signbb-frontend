import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BotonComponent } from 'ui-compartida';
import { Aviso } from '../../../models/lienzo.model';

/**
 * Confirmación antes de publicar un subgrafo. Muestra dónde aparecerá para
 * la cuidadora (la opción nueva en la pregunta puente), cuántos nodos tiene y
 * los avisos actuales. Si el backend responde 422 al publicar, el lienzo pasa
 * aquí los avisos que vinieron en la respuesta.
 */
@Component({
  selector: 'app-modal-publicar',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './modal-publicar.html',
  styleUrl: './modal-publicar.scss'
})
export class ModalPublicarComponent {
  @Input() nombre = '';
  /** Texto de la opción que verá la cuidadora. */
  @Input() etiquetaOpcion = '';
  /** Pregunta puente donde aparece la opción. */
  @Input() preguntaPuente = '';
  @Input() conteoNodos = 0;
  @Input() avisos: Aviso[] = [];
  @Input() publicando = false;
  @Input() error: string | null = null;
  /** true si ya estaba publicado: se reemplaza la versión vigente. */
  @Input() republicar = false;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected get bloqueantes(): Aviso[] {
    return this.avisos.filter(a => a.bloqueante);
  }

  protected get sueltos(): number {
    return this.avisos.filter(a => a.codigo === 'NODO_SUELTO').length;
  }
}
