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
  /** Nombre técnico del subgrafo. */
  @Input() nombre = '';
  /** Texto de la opción que verá la cuidadora. */
  @Input() etiquetaOpcion = '';
  /** Pregunta puente donde aparece la opción. */
  @Input() preguntaPuente = '';
  /** Número de nodos que se publicarán. */
  @Input() conteoNodos = 0;
  /** Avisos actuales del lienzo. */
  @Input() avisos: Aviso[] = [];
  /** True mientras se publica. */
  @Input() publicando = false;
  /** Error a mostrar si la publicación falla. */
  @Input() error: string | null = null;
  /** true si ya estaba publicado: se reemplaza la versión vigente. */
  @Input() republicar = false;
  /** true si el subgrafo tiene base de reglas: se publicará junto con el grafo. */
  @Input() publicaReglas = false;

  /** Emite cuando el usuario confirma publicar. */
  @Output() confirmar = new EventEmitter<void>();
  /** Emite al cancelar. */
  @Output() cancelar = new EventEmitter<void>();
  /** Emite cuando el usuario quiere ir al editor de reglas a corregir avisos. */
  @Output() irAReglas = new EventEmitter<void>();

  /** Avisos que impiden publicar. */
  protected get bloqueantes(): Aviso[] {
    return this.avisos.filter(a => a.bloqueante);
  }

  /** Avisos que vienen de las reglas del subgrafo. */
  protected get avisosReglas(): Aviso[] {
    return this.avisos.filter(a => a.codigo.startsWith('REGLA_'));
  }

  /** Cantidad de nodos sueltos (no bloquean, no se publican). */
  protected get sueltos(): number {
    return this.avisos.filter(a => a.codigo === 'NODO_SUELTO').length;
  }
}
