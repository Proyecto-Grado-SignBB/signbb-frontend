import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SesionService } from 'ui-compartida';
import { TelefonoPediatraComponent } from '../telefono-pediatra/telefono-pediatra';

/**
 * Perfil de la familia: sus datos de cuenta, el acceso a «Mis recorridos»,
 * «Cerrar sesión» y «Cerrar sesión en todos los dispositivos», que vuelven a
 * la bienvenida.
 *
 * MODIFICADO (ítem 2.4): permite guardar, cambiar o borrar el teléfono del
 * pediatra que usa «Contactar a mi pediatra» en el resultado.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink, TelefonoPediatraComponent],
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

  /** True mientras se pide cerrar la sesión en todos los dispositivos. */
  protected readonly cerrandoTodas = signal(false);
  /** Mensaje si no se pudo cerrar la sesión en todos los dispositivos. */
  protected readonly errorCerrarTodas = signal<string | null>(null);

  /** Cierra la sesión en todos los dispositivos y vuelve a la bienvenida. */
  protected cerrarTodas(): void {
    this.cerrandoTodas.set(true);
    this.errorCerrarTodas.set(null);
    this.sesion.cerrarTodas().subscribe({
      next: () => this.router.navigate(['/bienvenida']),
      error: () => {
        this.cerrandoTodas.set(false);
        this.errorCerrarTodas.set('No se pudo cerrar la sesión en todos los dispositivos. Intenta de nuevo.');
      }
    });
  }

  /** Cierra la sesión y vuelve a la bienvenida. */
  protected cerrarSesion(): void {
    this.sesion.salir();
    this.router.navigate(['/bienvenida']);
  }
}
