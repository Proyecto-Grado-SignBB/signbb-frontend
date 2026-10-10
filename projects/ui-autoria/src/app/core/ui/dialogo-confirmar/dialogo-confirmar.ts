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
  @Input() titulo = '¿Eliminar?';
  @Input() mensaje = '';
  @Input() textoConfirmar = 'Eliminar';
  @Input() textoOcupado = 'Eliminando…';
  @Input() ocupado = false;
  @Input() error: string | null = null;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('botonCancelar', { read: ElementRef }) private botonCancelar?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    this.botonCancelar?.nativeElement.querySelector('button')?.focus();
  }

  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.ocupado) {
      this.cancelar.emit();
    }
  }

  protected aceptar(): void {
    if (!this.ocupado) {
      this.confirmar.emit();
    }
  }
}
