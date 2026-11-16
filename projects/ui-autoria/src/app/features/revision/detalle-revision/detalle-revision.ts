import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { NivelAlerta } from 'ui-compartida';
import {
  BotonComponent,
  EtiquetaComponent,
  MensajeErrorComponent,
  SesionService
} from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
import { RevisionesStore } from '../../../core/revision/revisiones.store';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { ModalRechazoComponent } from '../../../core/ui/modal-rechazo/modal-rechazo';
import { AvisosComponent } from '../../subgrafos/lienzo/avisos/avisos';
import { VisorGrafoComponent } from '../../subgrafos/visor-grafo/visor-grafo';
import { VisorReglaComponent } from '../../reglas/editor-reglas/visor-regla/visor-regla';
import { iniciales } from '../../../core/sesion/sesion';
import {
  ETIQUETA_ESTADO,
  EstadoBorrador,
  NodoLienzo,
  ResumenSubgrafoDTO,
  SubgrafoDTO,
  nombreCategoria
} from '../../../models/lienzo.model';
import {
  BaseReglaDTO,
  CatalogoDTO,
  ETIQUETA_NIVEL,
  ReglaDTO,
  ResumenBaseReglaDTO
} from '../../../models/regla.model';
import { PanelNodoLecturaComponent } from './panel-nodo-lectura/panel-nodo-lectura';

/**
 * Detalle de una revisión: el supervisor ve el grafo completo y la base de
 * reglas del subgrafo, siempre en dos pestañas, y decide si lo aprueba (y se
 * publica) o lo rechaza con un comentario.
 */
@Component({
  selector: 'app-detalle-revision',
  standalone: true,
  imports: [
    RouterLink,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    ModalRechazoComponent,
    AvisosComponent,
    VisorGrafoComponent,
    VisorReglaComponent,
    PanelNodoLecturaComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './detalle-revision.html',
  styleUrl: './detalle-revision.scss'
})
export class DetalleRevisionComponent implements OnInit {
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;

  private readonly autoria = inject(AutoriaService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly store = inject(RevisionesStore);

  protected readonly subgrafo = signal<SubgrafoDTO | null>(null);
  protected readonly base = signal<BaseReglaDTO | null>(null);
  protected readonly catalogo = signal<CatalogoDTO | null>(null);
  protected readonly reglaSeleccionada = signal<ReglaDTO | null>(null);
  protected readonly resumen = signal<ResumenSubgrafoDTO | null>(null);
  /** Nodo abierto en el panel de solo lectura del visor. */
  protected readonly nodoSeleccionado = signal<NodoLienzo | null>(null);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<'grafo' | 'reglas'>('grafo');
  /** «revision» para aprobar/rechazar; «publicado» para consultar y despublicar. */
  protected readonly modo = signal<'revision' | 'publicado'>('revision');

  protected readonly mostrarAprobar = signal(false);
  protected readonly aprobando = signal(false);
  protected readonly errorAprobar = signal<string | null>(null);

  protected readonly mostrarRechazo = signal(false);
  protected readonly rechazando = signal(false);
  protected readonly errorRechazo = signal<string | null>(null);

  protected readonly mostrarDespublicar = signal(false);
  protected readonly despublicando = signal(false);
  protected readonly errorDespublicar = signal<string | null>(null);

  /** True si el subgrafo fue creado por el supervisor actual. */
  protected readonly esPropio = computed(() => {
    const s = this.subgrafo();
    const usuario = this.sesion.usuario();
    return s !== null && usuario !== null && s.autorId === usuario.id;
  });

  /** True si el subgrafo está en revisión, no es propio y se abrió desde pendientes. */
  protected readonly puedeDecidir = computed(() =>
    this.modo() === 'revision' && this.subgrafo()?.estado === 'EN_REVISION' && !this.esPropio()
  );

  /** True si se puede despublicar el contenido abierto en modo moderación. */
  protected readonly puedeDespublicar = computed(() =>
    this.modo() === 'publicado' && !!this.subgrafo()?.publicadoEn
  );

  /** Título del diálogo de despublicar. */
  protected readonly tituloDespublicar = computed(() => {
    const subgrafo = this.subgrafo();
    return subgrafo ? `¿Despublicar «${subgrafo.nombre}»?` : '¿Despublicar este subgrafo?';
  });

  /** Número de reglas de la base. */
  protected readonly totalReglas = computed(() => this.base()?.reglas.length ?? 0);

  /** Avisos del subgrafo y de sus reglas. */
  protected readonly avisos = computed(() => this.subgrafo()?.avisos ?? []);

  private id = 0;

  ngOnInit(): void {
    this.modo.set(this.ruta.snapshot.queryParamMap.get('modo') === 'publicado' ? 'publicado' : 'revision');
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  /** Carga el subgrafo, el resumen de la bandeja y su base de reglas. */
  protected cargar(): void {
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.error.set('Esa revisión no existe. Vuelve a «Revisión» y elige una de la lista.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.nodoSeleccionado.set(null);
    forkJoin({
      subgrafo: this.autoria.obtener(this.id),
      revisiones: this.autoria.listarRevisiones().pipe(
        catchError(() => of([] as ResumenSubgrafoDTO[]))
      )
    }).subscribe({
      next: ({ subgrafo, revisiones }) => {
        this.subgrafo.set(subgrafo);
        this.resumen.set(revisiones.find(r => r.id === this.id) ?? null);
        this.store.setPendientes(revisiones.length);
        this.cargando.set(false);
        this.cargarBase(subgrafo.grafoId);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo abrir la revisión. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
    });
  }

  /** Carga la base de reglas y el catálogo del grafo, si existen. */
  private cargarBase(grafoId: string): void {
    this.autoria.listarBases().pipe(
      catchError(() => of([] as ResumenBaseReglaDTO[])),
      switchMap(bases => {
        const resumen = bases.find(b => b.grafoId === grafoId);
        if (!resumen) {
          return of({ base: null as BaseReglaDTO | null, catalogo: null as CatalogoDTO | null });
        }
        return forkJoin({
          base: this.autoria.obtenerBase(resumen.id),
          catalogo: this.autoria.catalogo(grafoId).pipe(catchError(() => of(null as CatalogoDTO | null)))
        });
      })
    ).subscribe({
      next: ({ base, catalogo }) => {
        this.base.set(base);
        this.catalogo.set(catalogo);
        this.reglaSeleccionada.set(base?.reglas[0] ?? null);
      },
      error: () => {
        this.base.set(null);
        this.catalogo.set(null);
        this.reglaSeleccionada.set(null);
      }
    });
  }

  /** Cambia la pestaña visible. */
  protected verTab(tab: 'grafo' | 'reglas'): void {
    if (tab !== 'grafo') {
      this.nodoSeleccionado.set(null);
    }
    this.tab.set(tab);
  }

  /** Abre el detalle de un nodo del visor. */
  protected seleccionarNodo(nodo: NodoLienzo): void {
    this.nodoSeleccionado.set(nodo);
  }

  /** Cierra el detalle del nodo. */
  protected cerrarDetalleNodo(): void {
    this.nodoSeleccionado.set(null);
  }

  /** Selecciona una regla en el visor. */
  protected seleccionarRegla(regla: ReglaDTO): void {
    this.reglaSeleccionada.set(regla);
  }

  /** Vuelve a la bandeja de pendientes. */
  protected volver(): void {
    this.router.navigate(['/revision']);
  }

  /** Vuelve al buzón de publicados. */
  protected volverAlBuzon(): void {
    this.router.navigate(['/revision'], { queryParams: { vista: 'publicados' } });
  }

  /** Abre la confirmación de aprobar. */
  protected abrirAprobar(): void {
    if (!this.puedeDecidir()) {
      return;
    }
    this.errorAprobar.set(null);
    this.mostrarAprobar.set(true);
  }

  /** Cancela la confirmación de aprobar. */
  protected cancelarAprobar(): void {
    if (!this.aprobando()) {
      this.mostrarAprobar.set(false);
    }
  }

  /** Aprueba y publica el subgrafo con su base de reglas. */
  protected confirmarAprobar(): void {
    if (!this.puedeDecidir() || this.aprobando()) {
      return;
    }
    this.aprobando.set(true);
    this.errorAprobar.set(null);
    this.autoria.aprobarRevision(this.id).subscribe({
      next: () => {
        this.aprobando.set(false);
        this.mostrarAprobar.set(false);
        this.store.setPendientes(Math.max(0, this.store.pendientes() - 1));
        this.store.avisar('Publicado. Las familias ya ven la nueva versión.');
        this.router.navigate(['/revision']);
      },
      error: e => {
        this.aprobando.set(false);
        this.errorAprobar.set(mensajeDeError(e, 'No se pudo aprobar la revisión. Intenta de nuevo.'));
      }
    });
  }

  /** Abre el rechazo con comentario. */
  protected abrirRechazo(): void {
    if (!this.puedeDecidir()) {
      return;
    }
    this.errorRechazo.set(null);
    this.mostrarRechazo.set(true);
  }

  /** Cancela el rechazo. */
  protected cancelarRechazo(): void {
    if (!this.rechazando()) {
      this.mostrarRechazo.set(false);
    }
  }

  /** Abre la confirmación de despublicar. */
  protected abrirDespublicar(): void {
    if (!this.puedeDespublicar()) {
      return;
    }
    this.errorDespublicar.set(null);
    this.mostrarDespublicar.set(true);
  }

  /** Cancela la despublicación. */
  protected cancelarDespublicar(): void {
    if (!this.despublicando()) {
      this.mostrarDespublicar.set(false);
    }
  }

  /** Despublica el subgrafo y su base de reglas. */
  protected confirmarDespublicar(): void {
    if (!this.puedeDespublicar() || this.despublicando()) {
      return;
    }
    const subgrafo = this.subgrafo();
    if (!subgrafo) {
      return;
    }
    this.despublicando.set(true);
    this.errorDespublicar.set(null);
    this.autoria.despublicar(subgrafo.id).subscribe({
      next: () => {
        this.despublicando.set(false);
        this.mostrarDespublicar.set(false);
        this.store.avisar(`Se despublicó «${subgrafo.nombre}».`);
        this.volverAlBuzon();
      },
      error: e => {
        this.despublicando.set(false);
        this.errorDespublicar.set(mensajeDeError(e, 'No se pudo despublicar el subgrafo. Intenta de nuevo.'));
      }
    });
  }

  /** Rechaza la revisión con el comentario recibido. */
  protected confirmarRechazo(comentario: string): void {
    if (!this.puedeDecidir() || this.rechazando()) {
      return;
    }
    this.rechazando.set(true);
    this.errorRechazo.set(null);
    this.autoria.rechazarRevision(this.id, comentario).subscribe({
      next: () => {
        this.rechazando.set(false);
        this.mostrarRechazo.set(false);
        this.store.setPendientes(Math.max(0, this.store.pendientes() - 1));
        this.store.avisar('Rechazado. El médico recibió el comentario.');
        this.router.navigate(['/revision']);
      },
      error: e => {
        this.rechazando.set(false);
        this.errorRechazo.set(mensajeDeError(e, 'No se pudo rechazar la revisión. Intenta de nuevo.'));
      }
    });
  }

  /** Nombre legible de la categoría. */
  protected categoria(categoria: string): string {
    return nombreCategoria(categoria);
  }

  /** Iniciales del autor. */
  protected iniciales(nombre: string | null): string {
    return iniciales(nombre ?? '');
  }

  /** Texto relativo de la fecha de envío. */
  protected enviado(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return '';
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

  /** Tono de la etiqueta de un nivel de alerta. */
  protected tonoNivel(nivel: NivelAlerta): 'alerta' | 'aviso' | 'calma' {
    return nivel === 'URGENCIA' ? 'alerta' : nivel === 'CONSULTAR_MEDICO' ? 'aviso' : 'calma';
  }
}
