import { Component, Input, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from 'ui-compartida';
import { iniciales } from '../../sesion/sesion';

export type SeccionAutoria = 'subgrafos' | 'reglas' | 'perfil';

/**
 * Navegación lateral del panel de autoría (subgrafos, reglas de alarma y
 * perfil). El nombre y la institución salen de la sesión; «Cerrar sesión»
 * la cierra y vuelve al ingreso.
 */
@Component({
  selector: 'app-sidebar-autoria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar-autoria.html',
  styleUrl: './sidebar-autoria.scss'
})
export class SidebarAutoriaComponent {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** Qué ítem del menú se resalta como activo. */
  @Input() seccionActiva: SeccionAutoria = 'subgrafos';

  /** Nombre del médico de la sesión. */
  protected readonly nombreMedico = computed(() => this.sesion.usuario()?.nombre ?? '');
  /** Institución del médico de la sesión. */
  protected readonly institucion = computed(() => this.sesion.usuario()?.institucion ?? '');
  /** Iniciales del nombre del médico, para el avatar. */
  protected readonly iniciales = computed(() => iniciales(this.nombreMedico()));

  /** Cierra la sesión y lleva al ingreso. */
  protected salir(): void {
    this.sesion.salir();
    this.router.navigate(['/ingresar'], { replaceUrl: true });
  }
}
