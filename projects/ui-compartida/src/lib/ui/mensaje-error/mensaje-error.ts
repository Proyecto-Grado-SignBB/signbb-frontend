import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BotonComponent } from '../boton/boton';

@Component({
  selector: 'app-mensaje-error',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './mensaje-error.html',
  styleUrl: './mensaje-error.scss'
})
export class MensajeErrorComponent {
  @Input() texto = 'Ocurrió un problema. Intenta de nuevo.';
  @Output() reintentar = new EventEmitter<void>();
}