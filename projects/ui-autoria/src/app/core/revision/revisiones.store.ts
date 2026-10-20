import { Injectable, signal } from '@angular/core';

/**
 * Estado compartido y mínimo de la bandeja de revisión: cuántos pendientes
 * hay para el badge del sidebar y el mensaje breve que se muestra al volver
 * después de aprobar o rechazar. No hace peticiones por sí mismo.
 */
@Injectable({ providedIn: 'root' })
export class RevisionesStore {

  /** Revisiones pendientes que cargó la bandeja. */
  readonly pendientes = signal(0);

  /** Mensaje breve para la bandeja (por ejemplo, después de aprobar). */
  readonly mensaje = signal<string | null>(null);

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Actualiza el contador de pendientes. */
  setPendientes(total: number): void {
    this.pendientes.set(total);
  }

  /** Muestra un mensaje breve que desaparece solo. */
  avisar(texto: string): void {
    this.mensaje.set(texto);
    if (this.temporizador) {
      clearTimeout(this.temporizador);
    }
    this.temporizador = setTimeout(() => {
      if (this.mensaje() === texto) {
        this.mensaje.set(null);
      }
    }, 4000);
  }

  /** Limpia el mensaje actual. */
  limpiarMensaje(): void {
    this.mensaje.set(null);
  }
}
