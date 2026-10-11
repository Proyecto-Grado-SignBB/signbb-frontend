import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { BotonComponent } from 'ui-compartida';

/**
 * Confirmación propia de la interfaz para acciones que no se pueden deshacer
 * (eliminar), en lugar del {@code confirm()} del navegador. Mientras la
 * acción está en curso no se puede cerrar; si falla, el error se muestra
 * aquí mismo y el médico puede reintentar o cancelar.
 */
@Component({
  selector: 'app-dialogo-confirmar',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './dialogo-confirmar.html',
  styleUrl: './dialogo-confirmar.scss'
})
export class DialogoConfirmarComponent implements AfterViewInit {
  /** Título del diálogo. */
  @Input() titulo = '¿Eliminar?';
  /** Mensaje explicativo de la acción. */
  @Input() mensaje = '';
  /** Texto del botón que confirma. */
  @Input() textoConfirmar = 'Eliminar';
  /** Texto del botón mientras la acción está en curso. */
  @Input() textoOcupado = 'Eliminando…';
  /** True mientras la acción está en curso (bloquea cerrar y confirmar). */
  @Input() ocupado = false;
  /** Error a mostrar dentro del diálogo si la acción falla. */
  @Input() error: string | null = null;

  /** Emite cuando el usuario confirma. */
  @Output() confirmar = new EventEmitter<void>();
  /** Emite cuando el usuario cancela o pulsa Escape. */
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('botonCancelar', { read: ElementRef }) private botonCancelar?: ElementRef<HTMLElement>;

  /** Pone el foco en "cancelar" al abrir. */
  ngAfterViewInit(): void {
    this.botonCancelar?.nativeElement.querySelector('button')?.focus();
  }

  /** Cierra el diálogo con Escape si la acción no está en curso. */
  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.ocupado) {
      this.cancelar.emit();
    }
  }

  /** Confirma la acción si no está en curso. */
  protected aceptar(): void {
    if (!this.ocupado) {
      this.confirmar.emit();
    }
  }
}
