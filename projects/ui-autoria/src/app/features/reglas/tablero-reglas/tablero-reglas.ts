import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent, SesionService } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
import { esAjeno } from '../../../core/sesion/sesion';
import { ETIQUETA_ESTADO, EstadoBorrador, ResumenSubgrafoDTO } from '../../../models/lienzo.model';
import { ResumenBaseReglaDTO } from '../../../models/regla.model';

/**
 * Tablero de bases de reglas: lista cada base con su estado y su grafo, y
 * permite crear una nueva eligiendo el subgrafo con el que trabaja. Eliminar
 * una base se confirma en un diálogo propio (solo si nunca se publicó).
 *
 * Cada médico, incluido el supervisor, ve únicamente las bases que creó.
 */
@Component({
  selector: 'app-tablero-reglas',
  standalone: true,
  imports: [
    FormsModule,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './tablero-reglas.html',
  styleUrl: './tablero-reglas.scss'
})
export class TableroReglasComponent implements OnInit {
  /** Texto legible de cada estado del borrador. */
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  /** Bases de reglas del tablero. */
  protected readonly bases = signal<ResumenBaseReglaDTO[]>([]);
  /** True mientras se carga la lista de bases. */
  protected readonly cargando = signal(true);
  /** Error de carga de la lista de bases. */
  protected readonly error = signal<string | null>(null);

  private readonly sesion = inject(SesionService);

  /** Bases del médico que ingresó. */
  protected readonly propias = computed(
    () => this.bases().filter(b => !esAjeno(b.autorId, this.sesion.usuario()))
  );
  /** Subgrafos del médico, los únicos a los que puede asociar una base nueva. */
  protected readonly subgrafos = signal<ResumenSubgrafoDTO[]>([]);
  /** Error al cargar los subgrafos. */
  protected readonly errorSubgrafos = signal<string | null>(null);

  /** True si el formulario de crear está abierto. */
  protected readonly mostrarFormularioCrear = signal(false);
  /** True mientras se crea la base. */
  protected readonly creando = signal(false);
  /** Error del formulario de crear. */
  protected readonly errorCrear = signal<string | null>(null);
  protected nombreNuevo = '';
  protected descripcionNueva = '';
  protected grafoSeleccionado = '';

  /** Base que el médico pidió eliminar (diálogo abierto), o null. */
  protected readonly porEliminar = signal<ResumenBaseReglaDTO | null>(null);
  /** True mientras se elimina. */
  protected readonly eliminando = signal(false);
  /** Error de la última eliminación. */
  protected readonly errorEliminar = signal<string | null>(null);
  /** Confirmación breve de la última acción. */
  protected readonly mensaje = signal<string | null>(null);

  constructor(private autoria: AutoriaService, private router: Router) {}

  ngOnInit(): void {
    this.cargarBases();
    this.cargarSubgrafos();
  }

  /** Carga la lista de bases de reglas. */
  protected cargarBases(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.listarBases().subscribe({
      next: bases => {
        this.bases.set(bases);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo cargar la lista de bases. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
    });
  }

  /** Carga los subgrafos, que son los grafos a los que se asocia una base. */
  protected cargarSubgrafos(): void {
    this.errorSubgrafos.set(null);
    this.autoria.listar().subscribe({
      next: subgrafos => this.subgrafos.set(
        subgrafos.filter(s => !esAjeno(s.autorId, this.sesion.usuario()))),
      error: e => this.errorSubgrafos.set(
        mensajeDeError(e, 'No se pudieron cargar los subgrafos. Intenta de nuevo.'))
    });
  }

  /** Abre el formulario de crear. */
  protected abrirFormularioCrear(): void {
    this.mostrarFormularioCrear.set(true);
  }

  /** Cierra y limpia el formulario de crear. */
  protected cancelarCrear(): void {
    this.mostrarFormularioCrear.set(false);
    this.nombreNuevo = '';
    this.descripcionNueva = '';
    this.grafoSeleccionado = '';
    this.errorCrear.set(null);
  }

  /** True si el formulario de crear es válido. */
  protected get puedeCrear(): boolean {
    return this.nombreNuevo.trim().length > 0 && this.grafoSeleccionado !== '';
  }

  /** Crea la base y abre su editor. */
  protected confirmarCrear(): void {
    if (!this.puedeCrear || this.creando()) {
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.autoria.crearBase({
      nombre: this.nombreNuevo.trim(),
      descripcion: this.descripcionNueva.trim() || undefined,
      grafoId: this.grafoSeleccionado
    }).subscribe({
      next: creada => {
        this.creando.set(false);
        this.router.navigate(['/reglas', creada.id]);
      },
      error: e => {
        this.creando.set(false);
        this.errorCrear.set(mensajeDeError(e, 'No se pudo crear la base. Intenta de nuevo.'));
      }
    });
  }

  /** Abre el editor de una base. */
  protected abrirBase(id: number): void {
    this.router.navigate(['/reglas', id]);
  }

  /** Abre la confirmación de eliminar (solo si nunca se publicó). */
  protected eliminar(base: ResumenBaseReglaDTO): void {
    this.errorEliminar.set(null);
    this.porEliminar.set(base);
  }

  /** Cancela el diálogo de eliminar. */
  protected cancelarEliminar(): void {
    this.porEliminar.set(null);
    this.errorEliminar.set(null);
  }

  /** Elimina la base confirmada y recarga la lista. */
  protected confirmarEliminar(): void {
    const base = this.porEliminar();
    if (!base || this.eliminando()) {
      return;
    }
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.autoria.eliminarBase(base.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.avisar(`Se eliminó la base «${base.nombre}».`);
        this.cargarBases();
      },
      error: e => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeDeError(e, 'No se pudo eliminar la base. Intenta de nuevo.'));
      }
    });
  }

  /** Muestra un mensaje de confirmación que desaparece solo. */
  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) this.mensaje.set(null);
    }, 4000);
  }

  /** Tono de la etiqueta según el estado del borrador. */
  protected tonoEstado(estado: EstadoBorrador): 'calma' | 'aviso' | 'marca' {
    return estado === 'PUBLICADO' ? 'calma' : estado === 'BORRADOR' ? 'marca' : 'aviso';
  }

  /** Resumen de una fila del tablero (reglas y última edición). */
  protected resumen(base: ResumenBaseReglaDTO): string {
    const reglas = `${base.reglas} regla${base.reglas === 1 ? '' : 's'}`;
    return `${reglas} · editada ${this.tiempoRelativo(base.actualizadoEn)}`;
  }

  /** Convierte una fecha ISO en texto relativo ("hoy", "hace 3 días"). */
  private tiempoRelativo(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }
    const diffDias = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias <= 0) return 'hoy';
    if (diffDias === 1) return 'hace 1 día';
    if (diffDias < 30) return `hace ${diffDias} días`;
    const diffMeses = Math.floor(diffDias / 30);
    return diffMeses === 1 ? 'hace 1 mes' : `hace ${diffMeses} meses`;
  }
}
