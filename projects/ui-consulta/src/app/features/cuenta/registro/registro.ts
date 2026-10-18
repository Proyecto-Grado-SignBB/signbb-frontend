import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, SesionService } from 'ui-compartida';
import { destinoSeguro, mensajeCuenta } from '../../../core/sesion/sesion';

/** Largo mínimo de la contraseña (el back exige lo mismo). */
export const MINIMO_CONTRASENA = 8;

/**
 * Registro de una familia: nombre, correo y contraseña (dos veces) y si el
 * dispositivo es seguro. La cuenta
 * queda como `PADRE` y la sesión se abre de una vez. Un correo repetido o una
 * contraseña corta los explica el back con un 422.
 */
@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink, BotonComponent],
  templateUrl: './registro.html',
  styleUrl: './registro.scss'
})
export class RegistroComponent {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly minimo = MINIMO_CONTRASENA;
  protected nombre = '';
  protected correo = '';
  protected contrasena = '';
  protected confirmacion = '';
  /** Si es un dispositivo seguro, la sesión dura más; por defecto no. */
  protected dispositivoSeguro = false;
  /** True mientras se espera al back. */
  protected readonly registrando = signal(false);
  /** Error a mostrar en la pantalla. */
  protected readonly error = signal<string | null>(null);

  /** `?volver=` para conservarlo si la familia vuelve al ingreso. */
  protected get volver(): string | null {
    return this.ruta.snapshot.queryParamMap.get('volver');
  }

  /** Crea la cuenta y entra. */
  protected registrar(): void {
    if (this.registrando()) {
      return;
    }
    const problema = this.validar();
    if (problema) {
      this.error.set(problema);
      return;
    }
    this.registrando.set(true);
    this.error.set(null);
    this.sesion.registrar(this.nombre.trim(), this.correo.trim(), this.contrasena, this.dispositivoSeguro).subscribe({
      next: () => {
        this.registrando.set(false);
        this.router.navigateByUrl(destinoSeguro(this.volver));
      },
      error: e => {
        this.registrando.set(false);
        this.error.set(mensajeCuenta(e, 'No pudimos crear tu cuenta. Intenta de nuevo.'));
      }
    });
  }

  /** Lo que falta en el formulario, en palabras sencillas, o null si está completo. */
  private validar(): string | null {
    if (!this.nombre.trim() || !this.correo.trim() || !this.contrasena) {
      return 'Escribe tu nombre, tu correo y una contraseña.';
    }
    if (this.contrasena.length < MINIMO_CONTRASENA) {
      return `La contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres.`;
    }
    if (this.contrasena !== this.confirmacion) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }
}
