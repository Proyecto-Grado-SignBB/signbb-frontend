import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../core/layout/sidebar-autoria/sidebar-autoria';
import { UsuariosService } from '../../core/http/usuarios';
import { mensajeDeError } from '../../core/http/autoria';
import { iniciales } from '../../core/sesion/sesion';
import { DialogoConfirmarComponent } from '../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { ModalNuevoMedicoComponent } from './modal-nuevo-medico/modal-nuevo-medico';
import { NuevoUsuarioRequest, UsuarioDTO } from '../../models/usuario.model';

/**
 * Administración de médicos: lista las cuentas MEDICO, permite buscar por
 * nombre, crear cuentas nuevas y activarlas o desactivarlas. Las cuentas de
 * supervisor no se listan aquí.
 */
@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [
    FormsModule,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    ModalNuevoMedicoComponent,
    BotonComponent,
    MensajeErrorComponent
  ],
  templateUrl: './personal.html',
  styleUrl: './personal.scss'
})
export class PersonalComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);

  protected readonly usuarios = signal<UsuarioDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');
  protected readonly mensaje = signal<string | null>(null);

  protected readonly mostrarNuevo = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorNuevo = signal<string | null>(null);

  protected readonly porCambiar = signal<UsuarioDTO | null>(null);
  protected readonly cambiando = signal(false);
  protected readonly errorCambio = signal<string | null>(null);

  /** Solo las cuentas de médico. */
  protected readonly medicos = computed(() =>
    this.usuarios().filter(u => u.rol === 'MEDICO')
  );

  /** Médicos que coinciden con la búsqueda por nombre. */
  protected readonly filtrados = computed(() => {
    const consulta = normalizar(this.filtro());
    return this.medicos().filter(u => normalizar(u.nombre).includes(consulta));
  });

  /** Texto del contador de resultados. */
  protected readonly contador = computed(() => {
    const total = this.medicos().length;
    const visibles = this.filtrados().length;
    return this.filtro().trim() ? `${visibles} de ${total} médicos` : `${total} médico${total === 1 ? '' : 's'}`;
  });

  /** Título del diálogo de activar/desactivar. */
  protected readonly tituloCambio = computed(() => {
    const usuario = this.porCambiar();
    if (!usuario) return '';
    return usuario.activo ? `¿Desactivar a ${usuario.nombre}?` : `¿Activar a ${usuario.nombre}?`;
  });

  /** Mensaje del diálogo de activar/desactivar. */
  protected readonly mensajeCambio = computed(() => {
    const usuario = this.porCambiar();
    if (!usuario) return '';
    return usuario.activo
      ? 'No podrá ingresar y sus sesiones actuales se cerrarán. Sus subgrafos y reglas se conservan.'
      : 'Podrá volver a ingresar con su correo y contraseña.';
  });

  /** Texto del botón de confirmación. */
  protected readonly textoCambio = computed(() =>
    this.porCambiar()?.activo ? 'Desactivar cuenta' : 'Activar cuenta'
  );

  /** Tono del botón de confirmación. */
  protected readonly tonoCambio = computed(() =>
    this.porCambiar()?.activo ? 'alerta' as const : 'marca' as const
  );

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga las cuentas clínicas. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.usuariosService.listar().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo cargar el personal. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
    });
  }

  /** Iniciales del nombre, para el avatar. */
  protected iniciales(nombre: string): string {
    return iniciales(nombre);
  }

  /** Abre el alta de médico. */
  protected abrirNuevo(): void {
    this.errorNuevo.set(null);
    this.mostrarNuevo.set(true);
  }

  /** Cierra el alta de médico. */
  protected cancelarNuevo(): void {
    if (!this.guardando()) {
      this.mostrarNuevo.set(false);
    }
  }

  /** Crea la cuenta de médico. */
  protected crear(request: NuevoUsuarioRequest): void {
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.errorNuevo.set(null);
    this.usuariosService.crear(request).subscribe({
      next: creado => {
        this.usuarios.update(lista =>
          [...lista, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        );
        this.guardando.set(false);
        this.mostrarNuevo.set(false);
        this.avisar(`Se agregó a ${creado.nombre}.`);
      },
      error: e => {
        this.guardando.set(false);
        this.errorNuevo.set(mensajeDeError(e, 'No se pudo crear el médico. Intenta de nuevo.'));
      }
    });
  }

  /** Abre la confirmación de activar/desactivar. */
  protected pedirCambio(usuario: UsuarioDTO): void {
    this.errorCambio.set(null);
    this.porCambiar.set(usuario);
  }

  /** Cancela la confirmación. */
  protected cancelarCambio(): void {
    if (!this.cambiando()) {
      this.porCambiar.set(null);
    }
  }

  /** Activa o desactiva la cuenta confirmada. */
  protected confirmarCambio(): void {
    const usuario = this.porCambiar();
    if (!usuario || this.cambiando()) {
      return;
    }
    const activo = !usuario.activo;
    this.cambiando.set(true);
    this.errorCambio.set(null);
    this.usuariosService.cambiarActivo(usuario.id, activo).subscribe({
      next: actualizado => {
        this.usuarios.update(lista => lista.map(u => u.id === actualizado.id ? actualizado : u));
        this.cambiando.set(false);
        this.porCambiar.set(null);
        this.avisar(`${actualizado.nombre} quedó ${activo ? 'activo' : 'inactivo'}.`);
      },
      error: e => {
        this.cambiando.set(false);
        this.errorCambio.set(mensajeDeError(e, 'No se pudo cambiar el estado de la cuenta. Intenta de nuevo.'));
      }
    });
  }

  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) {
        this.mensaje.set(null);
      }
    }, 4000);
  }
}

/** Normaliza un texto para buscar sin distinguir mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
