import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SeccionAutoria = 'subgrafos' | 'perfil';

/**
 * Navegación lateral del panel de autoría (tablero, lienzo y perfil). Las
 * reglas de alarma aparecen deshabilitadas: llegan en la próxima entrega.
 * El nombre/institución del médico son un placeholder de entrada: aún no
 * existe autenticación de médicos (pendiente, ver plan de fases).
 */
@Component({
  selector: 'app-sidebar-autoria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar-autoria.html',
  styleUrl: './sidebar-autoria.scss'
})
export class SidebarAutoriaComponent {
  @Input() nombreMedico = 'Dra. Catalina Rodríguez';
  @Input() institucion = 'Fundación Canguro';
  /** Qué ítem del menú se resalta como activo. */
  @Input() seccionActiva: SeccionAutoria = 'subgrafos';

  protected get iniciales(): string {
    const limpio = this.nombreMedico.replace(/^Dra?\.\s*/i, '');
    return limpio
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0])
      .join('')
      .toUpperCase();
  }
}
