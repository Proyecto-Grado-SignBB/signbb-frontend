import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
import { Categoria, ETIQUETA_ESTADO, EstadoBorrador, ResumenSubgrafoDTO } from '../../../models/lienzo.model';

/**
 * Tablero de subgrafos del médico: los lista con su estado y crea uno nuevo
 * con su nombre, la categoría (la pregunta puente del grafo raíz donde se
 * ofrecerá) y el texto de la opción que verá la cuidadora.
 */
@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [FormsModule, SidebarAutoriaComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './tablero.html',
  styleUrl: './tablero.scss'
})
export class TableroComponent implements OnInit {
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  protected readonly subgrafos = signal<ResumenSubgrafoDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly mostrarFormularioCrear = signal(false);
  protected readonly creando = signal(false);
  protected readonly errorCrear = signal<string | null>(null);
  protected nombreNuevo = '';
  protected etiquetaNueva = '';

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly puenteSeleccionado = signal<string | null>(null);

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
    this.autoria.categorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: () => { /* el selector de categoría queda vacío y no se puede crear */ }
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
    this.puenteSeleccionado.set(null);
    this.errorCrear.set(null);
  }

  protected seleccionarCategoria(puenteId: string): void {
    this.puenteSeleccionado.set(puenteId);
  }

  protected get puedeCrear(): boolean {
    return this.nombreNuevo.trim().length > 0 && this.puenteSeleccionado() !== null;
  }

  protected confirmarCrear(): void {
    const puenteId = this.puenteSeleccionado();
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

  /** Solo se pueden borrar los que nunca se publicaron. */
  protected eliminar(subgrafo: ResumenSubgrafoDTO): void {
    if (!confirm(`¿Eliminar el borrador «${subgrafo.nombre}»? No se puede deshacer.`)) {
      return;
    }
    this.autoria.eliminar(subgrafo.id).subscribe({
      next: () => this.cargarSubgrafos(),
      error: e => this.error.set(mensajeDeError(e, 'No se pudo eliminar el borrador.'))
    });
  }

  protected tonoEstado(estado: EstadoBorrador): 'calma' | 'aviso' | 'marca' {
    return estado === 'PUBLICADO' ? 'calma' : estado === 'CAMBIOS_SIN_PUBLICAR' ? 'aviso' : 'marca';
  }

  /** Nombre legible de una categoría ("neurologico" → "Neurológico"). */
  protected legible(categoria: string): string {
    const conTilde: Record<string, string> = {
      respiracion: 'Respiración',
      neurologico: 'Neurológico',
      gastrointestinal: 'Gastrointestinal'
    };
    return conTilde[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1);
  }

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
