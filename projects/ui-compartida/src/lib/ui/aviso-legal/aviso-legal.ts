import { Component, Input } from '@angular/core';

/**
 * Aviso legal para recordar que SignBB orienta pero no reemplaza a un
 * profesional de salud. Se muestra en las pantallas iniciales.
 */
@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  templateUrl: './aviso-legal.html',
  styleUrl: './aviso-legal.scss'
})
export class AvisoLegalComponent {
  /** Texto del aviso; por defecto trae la frase estándar del sistema. */
  @Input() texto =
    'SignBB ofrece orientación de apoyo y no reemplaza la valoración ni el criterio de un profesional de salud.';
}