import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SeccionAutoria = 'grafos' | 'reglas';

/**
 * Navegación lateral del panel de autoría, compartida por las 5 pantallas.
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
  /** Grafo actualmente abierto: null en el tablero, donde no hay uno en contexto. */
  @Input() grafoId: number | null = null;
  /** Qué ítem del menú se resalta como activo. */
  @Input() seccionActiva: SeccionAutoria = 'grafos';

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
