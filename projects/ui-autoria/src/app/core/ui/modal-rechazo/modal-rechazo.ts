import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent } from 'ui-compartida';

/** Confirmación del rechazo de una revisión: exige un comentario para el autor. */
@Component({
  selector: 'app-modal-rechazo',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './modal-rechazo.html',
  styleUrl: './modal-rechazo.scss'
})
export class ModalRechazoComponent {
  /** True mientras se envía el rechazo. */
  @Input() ocupado = false;
  /** Error a mostrar si el rechazo falla. */
  @Input() error: string | null = null;

  /** Emite el comentario obligatorio para el médico. */
  @Output() rechazar = new EventEmitter<string>();
  /** Emite al cancelar o pulsar Escape. */
  @Output() cancelar = new EventEmitter<void>();

  protected comentario = '';
  protected tocado = false;

  /** True si el comentario no está vacío. */
  protected get puedeRechazar(): boolean {
    return this.comentario.trim().length > 0;
  }

  /** Cierra con Escape si no se está enviando. */
  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.ocupado) {
      this.cancelar.emit();
    }
  }

  /** Envía el comentario si es válido. */
  protected enviar(): void {
    this.tocado = true;
    if (this.puedeRechazar && !this.ocupado) {
      this.rechazar.emit(this.comentario.trim());
    }
  }
}
