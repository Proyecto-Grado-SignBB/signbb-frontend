import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BotonComponent } from '../boton/boton';

/**
 * Mensaje de error con un botón para reintentar. Lo usan las pantallas cuando
 * falla una petición a la API.
 */
@Component({
  selector: 'app-mensaje-error',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './mensaje-error.html',
  styleUrl: './mensaje-error.scss'
})
export class MensajeErrorComponent {
  /** Texto del error; por defecto un mensaje genérico. */
  @Input() texto = 'Ocurrió un problema. Intenta de nuevo.';
  /** Emite cuando el usuario pulsa "reintentar". */
  @Output() reintentar = new EventEmitter<void>();
}