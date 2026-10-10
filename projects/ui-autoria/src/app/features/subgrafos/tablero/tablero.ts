import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
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
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly ayudaNombreFamilia = AYUDA_NOMBRE_FAMILIA;

  protected readonly subgrafos = signal<ResumenSubgrafoDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly mostrarFormularioCrear = signal(false);
  protected readonly creando = signal(false);
  protected readonly errorCrear = signal<string | null>(null);
  protected nombreNuevo = '';
  protected etiquetaNueva = '';
  protected tocadoEtiqueta = false;

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly errorCategorias = signal<string | null>(null);
  protected readonly puenteSeleccionado = signal<string | null>(null);

  /** Borrador que el médico pidió eliminar (diálogo abierto), o null. */
  protected readonly porEliminar = signal<ResumenSubgrafoDTO | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);
  /** Confirmación breve de la última acción ("Se eliminó…"). */
  protected readonly mensaje = signal<string | null>(null);

  /** Placeholder hasta que exista autenticación de médicos (ver sidebar-autoria). */
  protected readonly autor = 'Dra. Catalina Rodríguez';
  protected readonly institucion = 'Fundación Canguro';

  protected readonly totalPublicados = computed(
    () => this.subgrafos().filter(s => s.estado !== 'BORRADOR').length
  );
  protected readonly totalBorradores = computed(
    () => this.subgrafos().filter(s => s.estado !== 'PUBLICADO').length
  );
  protected readonly totalNodos = computed(
    () => this.subgrafos().reduce((acc, s) => acc + s.nodos, 0)
  );

  constructor(private autoria: AutoriaService, private router: Router) {}

  ngOnInit(): void {
    this.cargarSubgrafos();
    this.cargarCategorias();
  }

  protected cargarCategorias(): void {
    this.errorCategorias.set(null);
    this.autoria.categorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: e => this.errorCategorias.set(
        mensajeDeError(e, 'No se pudieron cargar las categorías. Intenta de nuevo.'))
    });
  }

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

  protected abrirFormularioCrear(): void {
    this.mostrarFormularioCrear.set(true);
  }

  protected cancelarCrear(): void {
    this.mostrarFormularioCrear.set(false);
    this.nombreNuevo = '';
    this.etiquetaNueva = '';
    this.tocadoEtiqueta = false;
    this.puenteSeleccionado.set(null);
    this.errorCrear.set(null);
  }

  protected seleccionarCategoria(puenteId: string): void {
    this.puenteSeleccionado.set(puenteId);
  }

  protected get puedeCrear(): boolean {
    return this.nombreNuevo.trim().length > 0 && this.etiquetaNueva.trim().length > 0
      && this.puenteSeleccionado() !== null;
  }

  protected confirmarCrear(): void {
    const puenteId = this.puenteSeleccionado();
    this.tocadoEtiqueta = true;
    if (!this.puedeCrear || this.creando() || puenteId === null) {
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.autoria.crear({
      nombre: this.nombreNuevo.trim(),
      puenteId,
      etiquetaOpcion: this.etiquetaNueva.trim(),
      autor: this.autor,
      institucion: this.institucion
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

  protected abrirSubgrafo(id: number): void {
    this.router.navigate(['/subgrafos', id]);
  }

  /** Solo se pueden borrar los que nunca se publicaron: abre la confirmación. */
  protected eliminar(subgrafo: ResumenSubgrafoDTO): void {
    this.errorEliminar.set(null);
    this.porEliminar.set(subgrafo);
  }

  protected cancelarEliminar(): void {
    this.porEliminar.set(null);
    this.errorEliminar.set(null);
  }

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

  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) this.mensaje.set(null);
    }, 4000);
  }

  protected tonoEstado(estado: EstadoBorrador): 'calma' | 'aviso' | 'marca' {
    return estado === 'PUBLICADO' ? 'calma' : estado === 'CAMBIOS_SIN_PUBLICAR' ? 'aviso' : 'marca';
  }

  protected readonly legible = nombreCategoria;

  /** Pregunta puente de la categoría elegida, para la ayuda del formulario. */
  protected get preguntaElegida(): string | null {
    return this.categorias().find(c => c.puenteId === this.puenteSeleccionado())?.pregunta ?? null;
  }

  protected resumen(subgrafo: ResumenSubgrafoDTO): string {
    if (subgrafo.nodos === 0) {
      return 'Subgrafo nuevo, sin contenido todavía';
    }
    const nodos = `${subgrafo.nodos} nodo${subgrafo.nodos === 1 ? '' : 's'}`;
    return `${nodos} · editado ${this.tiempoRelativo(subgrafo.actualizadoEn)}`;
  }

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
