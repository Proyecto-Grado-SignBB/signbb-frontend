import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent } from 'ui-compartida';
import { NuevoUsuarioRequest } from '../../../models/usuario.model';

/** Alta de un médico: la cuenta siempre se crea con rol MEDICO. */
@Component({
  selector: 'app-modal-nuevo-medico',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './modal-nuevo-medico.html',
  styleUrl: './modal-nuevo-medico.scss'
})
export class ModalNuevoMedicoComponent {
  /** True mientras se crea la cuenta. */
  @Input() guardando = false;
  /** Error a mostrar si el alta falla. */
  @Input() error: string | null = null;

  /** Emite los datos de la cuenta nueva. */
  @Output() crear = new EventEmitter<NuevoUsuarioRequest>();
  /** Emite al cancelar o pulsar Escape. */
  @Output() cancelar = new EventEmitter<void>();

  protected nombre = '';
  protected correo = '';
  protected institucion = '';
  protected contrasena = '';
  protected tocadoNombre = false;
  protected tocadoCorreo = false;
  protected tocadoContrasena = false;

  /** True si el nombre está escrito. */
  protected get faltaNombre(): boolean {
    return this.tocadoNombre && !this.nombre.trim();
  }

  /** True si el correo tiene una forma válida. */
  protected get faltaCorreo(): boolean {
    return this.tocadoCorreo && !this.correoValido;
  }

  /** True si la contraseña tiene al menos 8 caracteres. */
  protected get faltaContrasena(): boolean {
    return this.tocadoContrasena && this.contrasena.length < 8;
  }

  /** True si el formulario se puede enviar. */
  protected get puedeCrear(): boolean {
    return !!this.nombre.trim() && this.correoValido && this.contrasena.length >= 8;
  }

  private get correoValido(): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.correo.trim());
  }

  /** Cierra con Escape si no se está guardando. */
  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.guardando) {
      this.cancelar.emit();
    }
  }

  /** Valida y emite el alta. */
  protected enviar(): void {
    this.tocadoNombre = true;
    this.tocadoCorreo = true;
    this.tocadoContrasena = true;
    if (!this.puedeCrear || this.guardando) {
      return;
    }
    this.crear.emit({
      nombre: this.nombre.trim(),
      correo: this.correo.trim(),
      contrasena: this.contrasena,
      rol: 'MEDICO',
      institucion: this.institucion.trim() || undefined
    });
  }
}
