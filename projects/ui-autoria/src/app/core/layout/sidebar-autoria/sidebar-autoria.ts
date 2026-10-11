import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SeccionAutoria = 'subgrafos' | 'reglas' | 'perfil';

/**
 * Navegación lateral del panel de autoría (subgrafos, reglas de alarma y
 * perfil). El nombre/institución del médico son un placeholder de entrada:
 * aún no existe autenticación de médicos (pendiente, ver plan de fases).
 */
@Component({
  selector: 'app-sidebar-autoria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar-autoria.html',
  styleUrl: './sidebar-autoria.scss'
})
export class SidebarAutoriaComponent {
  /** Nombre del médico (placeholder hasta que exista autenticación). */
  @Input() nombreMedico = 'Dra. Catalina Rodríguez';
  /** Institución del médico (placeholder). */
  @Input() institucion = 'Fundación Canguro';
  /** Qué ítem del menú se resalta como activo. */
  @Input() seccionActiva: SeccionAutoria = 'subgrafos';

  /** Iniciales del nombre del médico, para el avatar. */
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
