import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService, mensajeDeError } from '../../core/http/autoria';
import { RevisionesStore } from '../../core/revision/revisiones.store';
import { iniciales } from '../../core/sesion/sesion';
import { DialogoConfirmarComponent } from '../../core/ui/dialogo-confirmar/dialogo-confirmar';
import {
  ETIQUETA_ESTADO,
  EstadoBorrador,
  ResumenSubgrafoDTO,
  nombreCategoria
} from '../../models/lienzo.model';
import { ResumenBaseReglaDTO } from '../../models/regla.model';

type VistaRevision = 'pendientes' | 'publicados';

/**
 * Sección de revisión del supervisor. Tiene dos vistas:
 * - «Pendientes»: subgrafos que otros médicos enviaron a revisión.
 * - «Publicados»: contenido que las familias ya ven, para consultarlo y
 *   despublicarlo (junto con su base de reglas).
 */
@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [
    FormsModule,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './revision.html',
  styleUrl: './revision.scss'
})
export class RevisionComponent implements OnInit {
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  private readonly autoria = inject(AutoriaService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly store = inject(RevisionesStore);

  /** Revisiones pendientes. */
  protected readonly revisiones = signal<ResumenSubgrafoDTO[]>([]);
  /** Todos los subgrafos que puede ver el supervisor, para la vista de publicados. */
  private readonly subgrafos = signal<ResumenSubgrafoDTO[]>([]);
  /** Bases de reglas, para saber cuáles tienen reglas y cuántas. */
  private readonly bases = signal<ResumenBaseReglaDTO[]>([]);

  /** Vista activa. */
  protected readonly vista = signal<VistaRevision>('pendientes');
  /** Texto de búsqueda de subgrafos publicados. */
  protected readonly busqueda = signal('');

  /** True mientras se carga la sección. */
  protected readonly cargando = signal(true);
  /** Error de carga. */
  protected readonly error = signal<string | null>(null);
  /** Mensaje breve después de aprobar, rechazar o despublicar. */
  protected readonly mensaje = this.store.mensaje;

  /** Publicado que se quiere retirar. */
  protected readonly porDespublicar = signal<ResumenSubgrafoDTO | null>(null);
  /** True mientras se despublica. */
  protected readonly despublicando = signal(false);
  /** Error de la última despublicación. */
  protected readonly errorDespublicar = signal<string | null>(null);

  /** Total de revisiones pendientes. */
  protected readonly total = computed(() => this.revisiones().length);

  /** Subgrafos con una versión publicada, del más reciente al más antiguo. */
  protected readonly publicados = computed(() =>
    this.subgrafos()
      .filter(s => s.publicadoEn !== null)
      .sort((a, b) => (b.publicadoEn ?? '').localeCompare(a.publicadoEn ?? ''))
  );

  /** Publicados que coinciden con la búsqueda por nombre. */
  protected readonly publicadosFiltrados = computed(() => {
    const consulta = normalizar(this.busqueda());
    return this.publicados().filter(s => normalizar(s.nombre).includes(consulta));
  });

  /** Número que se muestra en el contador de la vista activa. */
  protected readonly contadorVista = computed(() =>
    this.vista() === 'pendientes' ? this.total() : this.publicados().length
  );

  /** Texto del contador de la vista activa. */
  protected readonly etiquetaContador = computed(() => {
    const total = this.contadorVista();
    const palabra = this.vista() === 'pendientes' ? 'pendiente' : 'publicado';
    return `${total} ${palabra}${total === 1 ? '' : 's'}`;
  });

  ngOnInit(): void {
    if (this.ruta.snapshot.queryParamMap.get('vista') === 'publicados') {
      this.vista.set('publicados');
    }
    this.cargar();
  }

  /** Carga pendientes, bases y todos los subgrafos. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      revisiones: this.autoria.listarRevisiones(),
      bases: this.autoria.listarBases().pipe(catchError(() => of([] as ResumenBaseReglaDTO[]))),
      subgrafos: this.autoria.listar()
    }).subscribe({
      next: ({ revisiones, bases, subgrafos }) => {
        this.revisiones.set(revisiones);
        this.bases.set(bases);
        this.subgrafos.set(subgrafos);
        this.store.setPendientes(revisiones.length);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo cargar la sección de revisión. Intenta de nuevo.'));
        this.cargando.set(false);
      }
    });
  }

  /** Muestra la bandeja de pendientes. */
  protected verPendientes(): void {
    this.vista.set('pendientes');
    this.actualizarUrl();
  }

  /** Muestra el contenido publicado. */
  protected verPublicados(): void {
    this.vista.set('publicados');
    this.actualizarUrl();
  }

  /** Devuelve la base de reglas de un grafo, si existe. */
  protected baseDe(grafoId: string): ResumenBaseReglaDTO | undefined {
    return this.bases().find(b => b.grafoId === grafoId);
  }

  /** True si el subgrafo tiene una base de reglas. */
  protected tieneBase(grafoId: string): boolean {
    return this.baseDe(grafoId) !== undefined;
  }

  /** Abre el detalle de una revisión pendiente. */
  protected abrir(id: number): void {
    this.router.navigate(['/revision', id]);
  }

  /** Abre el detalle de un subgrafo publicado en modo moderación. */
  protected verDetallePublicado(id: number): void {
    this.router.navigate(['/revision', id], { queryParams: { modo: 'publicado' } });
  }

  /** Abre la confirmación para despublicar. */
  protected abrirDespublicar(revision: ResumenSubgrafoDTO): void {
    this.errorDespublicar.set(null);
    this.porDespublicar.set(revision);
  }

  /** Cancela la despublicación. */
  protected cancelarDespublicar(): void {
    if (!this.despublicando()) {
      this.porDespublicar.set(null);
    }
  }

  /** Despublica el subgrafo y su base de reglas. */
  protected confirmarDespublicar(): void {
    const revision = this.porDespublicar();
    if (!revision || this.despublicando()) {
      return;
    }
    this.despublicando.set(true);
    this.errorDespublicar.set(null);
    this.autoria.despublicar(revision.id).subscribe({
      next: () => {
        this.despublicando.set(false);
        this.porDespublicar.set(null);
        this.store.avisar(`Se despublicó «${revision.nombre}».`);
        this.cargar();
      },
      error: e => {
        this.despublicando.set(false);
        this.errorDespublicar.set(mensajeDeError(e, 'No se pudo despublicar el subgrafo. Intenta de nuevo.'));
      }
    });
  }

  /** Nombre legible de la categoría. */
  protected categoria(categoria: string): string {
    return nombreCategoria(categoria);
  }

  /** Iniciales del autor, para el avatar. */
  protected iniciales(nombre: string | null): string {
    return iniciales(nombre ?? '');
  }

  /** Texto relativo de una fecha de envío o publicación. */
  protected enviado(iso: string | null): string {
    if (!iso) {
      return 'recién';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return 'recién';
    }
    const minutos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60000));
    if (minutos < 1) return 'ahora mismo';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ayer';
    if (dias < 30) return `hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
  }

  /** Tono de la etiqueta del estado. */
  protected tonoEstado(estado: EstadoBorrador): 'calma' | 'aviso' | 'marca' {
    return estado === 'PUBLICADO' ? 'calma' : estado === 'BORRADOR' ? 'marca' : 'aviso';
  }

  /** Refleja la vista activa en la URL para poder volver desde el detalle. */
  private actualizarUrl(): void {
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { vista: this.vista() === 'publicados' ? 'publicados' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
