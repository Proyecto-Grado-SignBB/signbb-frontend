import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, MENSAJE_SESION_TERMINADA, SesionService } from 'ui-compartida';
import { MENSAJE_CUENTA_CLINICA, destinoSeguro, mensajeCuenta } from '../../../core/sesion/sesion';

/**
 * Ingreso de las familias con correo y contraseña; se pregunta si el
 * dispositivo es seguro para mantener la sesión abierta. Al ingresar vuelve a la
 * ruta de `?volver=` o al inicio. Una cuenta de médico se rechaza y se cierra:
 * su app es la de autoría.
 */
@Component({
  selector: 'app-ingreso',
  standalone: true,
  imports: [FormsModule, RouterLink, BotonComponent],
  templateUrl: './ingreso.html',
  styleUrl: './ingreso.scss'
})
export class IngresoComponent implements OnInit {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected correo = '';
  protected contrasena = '';
  /** Si es un dispositivo seguro, la sesión dura más; por defecto no. */
  protected dispositivoSeguro = false;
  /** True mientras se espera al back. */
  protected readonly ingresando = signal(false);
  /** Error a mostrar en la pantalla. */
  protected readonly error = signal<string | null>(null);

  /** `?volver=` para conservarlo si la familia pasa a crear su cuenta. */
  protected get volver(): string | null {
    return this.ruta.snapshot.queryParamMap.get('volver');
  }

  ngOnInit(): void {
    if (this.ruta.snapshot.queryParamMap.get('motivo') === 'sesion') {
      this.error.set(MENSAJE_SESION_TERMINADA);
    }
    if (this.ruta.snapshot.queryParamMap.get('motivo') === 'rol') {
      this.sesion.salir();
      this.error.set(MENSAJE_CUENTA_CLINICA);
    } else if (this.sesion.vigente() && this.sesion.tieneRol('PADRE')) {
      this.router.navigateByUrl(destinoSeguro(this.volver));
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
    this.sesion.ingresar(this.correo.trim(), this.contrasena, this.dispositivoSeguro).subscribe({
      next: () => {
        this.ingresando.set(false);
        if (!this.sesion.tieneRol('PADRE')) {
          this.sesion.salir();
          this.error.set(MENSAJE_CUENTA_CLINICA);
          return;
        }
        this.router.navigateByUrl(destinoSeguro(this.volver));
      },
      error: e => {
        this.ingresando.set(false);
        this.contrasena = '';
        this.error.set(mensajeCuenta(e, 'No pudimos ingresar. Intenta de nuevo.'));
      }
    });
  }
}
