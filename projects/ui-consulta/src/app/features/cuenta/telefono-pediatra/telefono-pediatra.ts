import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent, SesionService } from 'ui-compartida';
import { mensajeCuenta } from '../../../core/sesion/sesion';

/** Mismo patrón que valida el back (`PatronesTexto.TELEFONO`): dígitos, `+` y espacios. */
const PATRON_TELEFONO = /^[+0-9 ]{7,20}$/;

/** Aviso cuando el número no tiene un formato válido. */
export const MENSAJE_TELEFONO_INVALIDO = 'Escribe solo números, espacios o +, entre 7 y 20 caracteres.';

/**
 * Formulario corto para guardar el teléfono del pediatra en la cuenta del
 * padre. Arranca con el número guardado; dejarlo vacío lo borra. Lo usan el
 * resultado (si aún no hay número) y el perfil.
 */
@Component({
  selector: 'app-telefono-pediatra',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './telefono-pediatra.html',
  styleUrl: './telefono-pediatra.scss'
})
export class TelefonoPediatraComponent implements OnInit {
  private readonly sesion = inject(SesionService);

  /** Avisa con el número guardado (o null si se borró). */
  @Output() guardado = new EventEmitter<string | null>();

  protected telefono = '';
  /** True mientras se espera al back. */
  protected readonly guardando = signal(false);
  /** Motivo por el que no se guardó. */
  protected readonly error = signal<string | null>(null);
  /** Confirmación tras guardar. */
  protected readonly listo = signal(false);

  ngOnInit(): void {
    this.telefono = this.sesion.usuario()?.telefonoPediatra ?? '';
  }

  /** Valida el número y lo guarda en el back. */
  protected guardar(): void {
    const valor = this.telefono.trim();
    this.listo.set(false);
    if (valor && !PATRON_TELEFONO.test(valor)) {
      this.error.set(MENSAJE_TELEFONO_INVALIDO);
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.sesion.guardarTelefonoPediatra(valor).subscribe({
      next: usuario => {
        this.guardando.set(false);
        this.listo.set(true);
        this.guardado.emit(usuario.telefonoPediatra ?? null);
      },
      error: e => {
        this.guardando.set(false);
        this.error.set(mensajeCuenta(e, 'No pudimos guardar el número. Intenta de nuevo.'));
      }
    });
  }
}
