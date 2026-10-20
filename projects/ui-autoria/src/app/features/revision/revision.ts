import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService, mensajeDeError } from '../../core/http/autoria';
import { RevisionesStore } from '../../core/revision/revisiones.store';
import { iniciales } from '../../core/sesion/sesion';
import { ETIQUETA_ESTADO, ResumenSubgrafoDTO, nombreCategoria } from '../../models/lienzo.model';
import { ResumenBaseReglaDTO } from '../../models/regla.model';

/**
 * Bandeja de revisión del supervisor: subgrafos que otros médicos enviaron.
 * Cada tarjeta muestra el autor y la categoría; al abrirla se revisan el grafo
 * completo y su base de reglas antes de aprobar o rechazar.
 */
@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [SidebarAutoriaComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './revision.html',
  styleUrl: './revision.scss'
})
export class RevisionComponent implements OnInit {
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  private readonly autoria = inject(AutoriaService);
  private readonly router = inject(Router);
  private readonly store = inject(RevisionesStore);

  /** Revisiones pendientes. */
  protected readonly revisiones = signal<ResumenSubgrafoDTO[]>([]);
  /** GrafoIds que tienen una base de reglas asociada. */
  private readonly bases = signal(new Set<string>());
  /** True mientras se carga la bandeja. */
  protected readonly cargando = signal(true);
  /** Error de carga. */
  protected readonly error = signal<string | null>(null);
  /** Mensaje breve después de aprobar o rechazar. */
  protected readonly mensaje = this.store.mensaje;
  /** Total de revisiones pendientes. */
  protected readonly total = computed(() => this.revisiones().length);

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga las revisiones y las bases para saber qué tarjetas tienen reglas. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      revisiones: this.autoria.listarRevisiones(),
      bases: this.autoria.listarBases().pipe(catchError(() => of([] as ResumenBaseReglaDTO[])))
    }).subscribe({
      next: ({ revisiones, bases }) => {
        this.revisiones.set(revisiones);
        this.bases.set(new Set(bases.map(b => b.grafoId)));
        this.store.setPendientes(revisiones.length);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo cargar la bandeja de revisión. Intenta de nuevo.'));
        this.cargando.set(false);
      }
    });
  }

  /** True si el subgrafo tiene una base de reglas. */
  protected tieneBase(grafoId: string): boolean {
    return this.bases().has(grafoId);
  }

  /** Abre el detalle de la revisión. */
  protected abrir(id: number): void {
    this.router.navigate(['/revision', id]);
  }

  /** Nombre legible de la categoría. */
  protected categoria(categoria: string): string {
    return nombreCategoria(categoria);
  }

  /** Iniciales del autor, para el avatar. */
  protected iniciales(nombre: string | null): string {
    return iniciales(nombre ?? '');
  }

  /** Texto relativo de la fecha de envío. */
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
  protected tonoEstado(): 'aviso' {
    return 'aviso';
  }
}
