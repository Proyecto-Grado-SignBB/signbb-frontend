import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent, SesionService } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
import { esAjeno } from '../../../core/sesion/sesion';
import {
  AYUDA_NOMBRE_FAMILIA,
  Categoria,
  ETIQUETA_ESTADO,
  EstadoBorrador,
  ResumenSubgrafoDTO,
  nombreCategoria
} from '../../../models/lienzo.model';

/**
 * Tablero de subgrafos del médico: los lista con su estado y crea uno nuevo
 * con su nombre técnico, la categoría (la pregunta puente del grafo raíz
 * donde se ofrecerá) y el nombre para la familia, que es la opción que verá
 * la cuidadora. Eliminar un borrador se confirma en un diálogo propio.
 *
 * Cada médico, incluido el supervisor, ve únicamente los subgrafos que creó.
 */
@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [
    FormsModule,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './tablero.html',
  styleUrl: './tablero.scss'
})
export class TableroComponent implements OnInit {
  /** Texto legible de cada estado del borrador. */
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  /** Texto de ayuda del campo «Nombre para la familia». */
  protected readonly ayudaNombreFamilia = AYUDA_NOMBRE_FAMILIA;

  /** Subgrafos del tablero. */
  protected readonly subgrafos = signal<ResumenSubgrafoDTO[]>([]);
  /** True mientras se carga la lista. */
  protected readonly cargando = signal(true);
  /** Error de carga de la lista. */
  protected readonly error = signal<string | null>(null);

  /** True si el formulario de crear está abierto. */
  protected readonly mostrarFormularioCrear = signal(false);
  /** True mientras se crea el subgrafo. */
  protected readonly creando = signal(false);
  /** Error del formulario de crear. */
  protected readonly errorCrear = signal<string | null>(null);
  protected nombreNuevo = '';
  protected etiquetaNueva = '';
  protected tocadoNombre = false;
  protected tocadoEtiqueta = false;
  /** True desde que el médico pulsa "Crear": a partir de ahí se explica todo lo que falta. */
  protected intentoCrear = false;

  /** Categorías disponibles (preguntas puente del grafo raíz). */
  protected readonly categorias = signal<Categoria[]>([]);
  /** Error al cargar las categorías. */
  protected readonly errorCategorias = signal<string | null>(null);
  /** Categoría elegida en el formulario de crear. */
  protected readonly puenteSeleccionado = signal<string | null>(null);

  /** Borrador que el médico pidió eliminar (diálogo abierto), o null. */
  protected readonly porEliminar = signal<ResumenSubgrafoDTO | null>(null);
  /** True mientras se elimina. */
  protected readonly eliminando = signal(false);
  /** Error de la última eliminación. */
  protected readonly errorEliminar = signal<string | null>(null);
  /** Confirmación breve de la última acción ("Se eliminó…"). */
  protected readonly mensaje = signal<string | null>(null);

  private readonly sesion = inject(SesionService);

  /** Subgrafos del médico que ingresó. */
  protected readonly propios = computed(
    () => this.subgrafos().filter(s => !esAjeno(s.autorId, this.sesion.usuario()))
  );

  /** Subgrafos propios que las cuidadoras ya ven (aunque tengan cambios o estén en revisión). */
  protected readonly totalPublicados = computed(
    () => this.propios().filter(s => s.publicadoEn !== null).length
  );
  /** Subgrafos propios con algo sin publicar (borradores, cambios o en revisión). */
  protected readonly totalBorradores = computed(
    () => this.propios().filter(s => s.estado !== 'PUBLICADO').length
  );
  /** Suma de nodos de los subgrafos propios. */
  protected readonly totalNodos = computed(
    () => this.propios().reduce((acc, s) => acc + s.nodos, 0)
  );

  constructor(private autoria: AutoriaService, private router: Router) {}

  ngOnInit(): void {
    this.cargarSubgrafos();
    this.cargarCategorias();
  }

  /** Carga las categorías (preguntas puente) para el formulario. */
  protected cargarCategorias(): void {
    this.errorCategorias.set(null);
    this.autoria.categorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: e => this.errorCategorias.set(
        mensajeDeError(e, 'No se pudieron cargar las categorías. Intenta de nuevo.'))
    });
  }

  /** Carga la lista de subgrafos del tablero. */
  protected cargarSubgrafos(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.listar().subscribe({
      next: subgrafos => {
        this.subgrafos.set(subgrafos);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo cargar la lista de subgrafos. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
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
    this.etiquetaNueva = '';
    this.tocadoNombre = false;
    this.tocadoEtiqueta = false;
    this.intentoCrear = false;
    this.puenteSeleccionado.set(null);
    this.errorCrear.set(null);
  }

  /** Elige la categoría del nuevo subgrafo. */
  protected seleccionarCategoria(puenteId: string): void {
    this.puenteSeleccionado.set(puenteId);
  }

  protected get faltaNombre(): boolean {
    return (this.tocadoNombre || this.intentoCrear) && !this.nombreNuevo.trim();
  }

  protected get faltaCategoria(): boolean {
    return this.intentoCrear && this.puenteSeleccionado() === null;
  }

  protected get faltaEtiqueta(): boolean {
    return (this.tocadoEtiqueta || this.intentoCrear) && !this.etiquetaNueva.trim();
  }

  /** True si el formulario de crear es válido. */
  protected get puedeCrear(): boolean {
    return this.nombreNuevo.trim().length > 0 && this.etiquetaNueva.trim().length > 0
      && this.puenteSeleccionado() !== null;
  }

  /** Crea el subgrafo y abre su lienzo. */
  protected confirmarCrear(): void {
    const puenteId = this.puenteSeleccionado();
    this.intentoCrear = true;
    if (!this.puedeCrear || this.creando() || puenteId === null) {
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.autoria.crear({
      nombre: this.nombreNuevo.trim(),
      puenteId,
      etiquetaOpcion: this.etiquetaNueva.trim()
    }).subscribe({
      next: creado => {
        this.creando.set(false);
        this.router.navigate(['/subgrafos', creado.id]);
      },
      error: e => {
        this.creando.set(false);
        this.errorCrear.set(mensajeDeError(e, 'No se pudo crear el subgrafo. Intenta de nuevo.'));
      }
    });
  }

  /** Abre el lienzo de un subgrafo. */
  protected abrirSubgrafo(id: number): void {
    this.router.navigate(['/subgrafos', id]);
  }

  /** Solo se pueden borrar los que nunca se publicaron: abre la confirmación. */
  protected eliminar(subgrafo: ResumenSubgrafoDTO): void {
    this.errorEliminar.set(null);
    this.porEliminar.set(subgrafo);
  }

  /** Cancela el diálogo de eliminar. */
  protected cancelarEliminar(): void {
    this.porEliminar.set(null);
    this.errorEliminar.set(null);
  }

  /** Elimina el borrador confirmado y recarga la lista. */
  protected confirmarEliminar(): void {
    const subgrafo = this.porEliminar();
    if (!subgrafo || this.eliminando()) {
      return;
    }
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.autoria.eliminar(subgrafo.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.avisar(`Se eliminó el borrador «${subgrafo.nombre}».`);
        this.cargarSubgrafos();
      },
      error: e => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeDeError(e, 'No se pudo eliminar el borrador. Intenta de nuevo.'));
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

  /** Nombre legible de una categoría, expuesto a la plantilla. */
  protected readonly legible = nombreCategoria;

  /** Pregunta puente de la categoría elegida, para la ayuda del formulario. */
  protected get preguntaElegida(): string | null {
    return this.categorias().find(c => c.puenteId === this.puenteSeleccionado())?.pregunta ?? null;
  }

  /** Resumen de una fila del tablero (nodos y última edición). */
  protected resumen(subgrafo: ResumenSubgrafoDTO): string {
    if (subgrafo.nodos === 0) {
      return 'Subgrafo nuevo, sin contenido todavía';
    }
    const nodos = `${subgrafo.nodos} nodo${subgrafo.nodos === 1 ? '' : 's'}`;
    return `${nodos} · editado ${this.tiempoRelativo(subgrafo.actualizadoEn)}`;
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
