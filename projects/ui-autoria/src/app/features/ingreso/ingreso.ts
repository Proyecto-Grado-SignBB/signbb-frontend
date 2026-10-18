import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, MENSAJE_SESION_TERMINADA, SesionService } from 'ui-compartida';
import { mensajeDeError } from '../../core/http/autoria';
import { ROLES_AUTORIA } from '../../core/sesion/sesion';

/** Mensaje para una cuenta de familia que intenta entrar a la app de autoría. */
export const MENSAJE_CUENTA_FAMILIA = 'Esta cuenta es de familia; usa la app de consulta.';

/**
 * Ingreso de médicos y supervisores con correo y contraseña. No hay registro:
 * las cuentas clínicas las crea un supervisor. Al ingresar vuelve a la ruta
 * de `?volver=` o al tablero. Una cuenta de padre se rechaza y se cierra.
 */
@Component({
  selector: 'app-ingreso',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './ingreso.html',
  styleUrl: './ingreso.scss'
})
export class IngresoComponent implements OnInit {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected correo = '';
  protected contrasena = '';
  /** True mientras se espera al back. */
  protected readonly ingresando = signal(false);
  /** Error a mostrar en la pantalla. */
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.ruta.snapshot.queryParamMap.get('motivo') === 'sesion') {
      this.error.set(MENSAJE_SESION_TERMINADA);
    }
    if (this.ruta.snapshot.queryParamMap.get('motivo') === 'rol') {
      this.sesion.salir();
      this.error.set(MENSAJE_CUENTA_FAMILIA);
    } else if (this.sesion.vigente() && this.sesion.tieneRol(...ROLES_AUTORIA)) {
      this.router.navigateByUrl(this.destino());
    }
  }

  /** Ingresa con los datos del formulario. */
  protected ingresar(): void {
    if (this.ingresando()) {
      return;
    }
    if (!this.correo.trim() || !this.contrasena) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.ingresando.set(true);
    this.error.set(null);
    this.sesion.ingresar(this.correo.trim(), this.contrasena).subscribe({
      next: () => {
        this.ingresando.set(false);
        if (!this.sesion.tieneRol(...ROLES_AUTORIA)) {
          this.sesion.salir();
          this.error.set(MENSAJE_CUENTA_FAMILIA);
          return;
        }
        this.router.navigateByUrl(this.destino());
      },
      error: e => {
        this.ingresando.set(false);
        this.contrasena = '';
        this.error.set(mensajeDeError(e, 'No se pudo ingresar. Intenta de nuevo.'));
      }
    });
  }

  /** Ruta de `?volver=` si es interna, o el tablero. */
  private destino(): string {
    const volver = this.ruta.snapshot.queryParamMap.get('volver');
    return volver && volver.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/ingresar')
      ? volver
      : '/subgrafos';
  }
}
