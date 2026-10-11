import { Component, Input } from '@angular/core';

/** Color semántico de la insignia. */
export type TonoInsignia = 'marca' | 'calma' | 'alerta' | 'aviso';

/**
 * Círculo con un ícono, usado para reforzar visualmente el nivel de alerta de
 * un resultado. El ícono se proyecta desde la plantilla que lo usa.
 */
@Component({
  selector: 'app-insignia-icono',
  standalone: true,
  templateUrl: './insignia-icono.html',
  styleUrl: './insignia-icono.scss'
})
export class InsigniaIconoComponent {
  /** Color semántico; por defecto el color de marca. */
  @Input() tono: TonoInsignia = 'marca';
  /** Diámetro de la insignia en píxeles. */
  @Input() tamano = 72;
  /** true = fondo sólido oscuro + ícono blanco (pantallas de resultado). */
  @Input() solido = false;
}