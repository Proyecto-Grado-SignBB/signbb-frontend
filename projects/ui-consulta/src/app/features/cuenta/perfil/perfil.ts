import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from 'ui-compartida';

/**
 * Perfil de la familia: sus datos de cuenta, el acceso a «Mis recorridos» y
 * «Cerrar sesión», que vuelve a la bienvenida.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** Usuario con sesión (la ruta pide cuenta de familia). */
  protected readonly usuario = this.sesion.usuario;

  /** Iniciales del nombre para el avatar ("Papá Uno" → "PU"). */
  protected readonly iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join(''));

  /** Cierra la sesión y vuelve a la bienvenida. */
  protected cerrarSesion(): void {
    this.sesion.salir();
    this.router.navigate(['/bienvenida']);
  }
}
