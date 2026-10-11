import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { DatosSubgrafo, ModalDatosComponent } from '../../../core/ui/modal-datos/modal-datos';
import { AutoriaService, avisosDeError, mensajeDeError } from '../../../core/http/autoria';
import {
  Aviso,
  ETIQUETA_DESENLACE,
  ETIQUETA_ESTADO,
  NodoLienzo,
  NodoRequest,
  SubgrafoDTO,
  nombreCategoria
} from '../../../models/lienzo.model';
import { AvisosComponent } from './avisos/avisos';
import { ContextoPanel, PanelNodoComponent } from './panel-nodo/panel-nodo';
import { MEDIDAS, Rama, distribuir } from './layout';

/**
 * El lienzo de un subgrafo (opción C del deck): un árbol que crece hacia la
 * derecha con un "+" en cada respuesta que todavía no dice qué pasa después.
 * Cada operación va al backend, que devuelve el borrador completo, y el
 * lienzo se vuelve a distribuir con {@link distribuir}.
 */
@Component({
  selector: 'app-lienzo',
  standalone: true,
  imports: [
    RouterLink,
    SidebarAutoriaComponent,
    ModalPublicarComponent,
    DialogoConfirmarComponent,
    ModalDatosComponent,
    PanelNodoComponent,
    AvisosComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './lienzo.html',
  styleUrl: './lienzo.scss'
})
export class LienzoComponent implements OnInit {
  /** Medidas del lienzo, expuestas a la plantilla. */
  protected readonly medidas = MEDIDAS;
  /** Texto legible de cada desenlace. */
  protected readonly etiquetaDesenlace = ETIQUETA_DESENLACE;
  /** Texto legible de cada estado del borrador. */
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  /** Nombre legible de una categoría. */
  protected readonly nombreCategoria = nombreCategoria;

  /** Borrador actual (lienzo y avisos). */
  protected readonly subgrafo = signal<SubgrafoDTO | null>(null);
  /** True mientras se carga el subgrafo. */
  protected readonly cargando = signal(true);
  /** Error de carga del subgrafo. */
  protected readonly error = signal<string | null>(null);

  /** Panel de nodo abierto, o null si está cerrado. */
  protected readonly contexto = signal<ContextoPanel | null>(null);
  /** True mientras se guarda una operación del panel. */
  protected readonly ocupado = signal(false);
  /** Error de la última operación del panel. */
  protected readonly errorPanel = signal<string | null>(null);
  /** Id del nodo o de la respuesta resaltada (al tocar un aviso o al abrir el panel). */
  protected readonly resaltado = signal<string | null>(null);

  /** True si el modal de publicar está abierto. */
  protected readonly mostrarPublicar = signal(false);
  /** True mientras se publica. */
  protected readonly publicando = signal(false);
  /** Error de la última publicación. */
  protected readonly errorPublicar = signal<string | null>(null);
  /** Avisos mostrados en el modal de publicar. */
  protected readonly avisosPublicar = signal<Aviso[]>([]);
  /** Texto de la pregunta puente donde aparecerá la opción. */
  protected readonly preguntaPuente = signal('');
  /** Mensaje de confirmación breve (desaparece solo). */
  protected readonly mensaje = signal<string | null>(null);

  /** Nodo que el médico pidió eliminar (diálogo abierto), o null. */
  protected readonly porEliminar = signal<NodoLienzo | null>(null);
  /** True mientras se elimina un nodo. */
  protected readonly eliminando = signal(false);
  /** Error de la última eliminación. */
  protected readonly errorEliminar = signal<string | null>(null);

  /** True si el modal de datos del subgrafo está abierto. */
  protected readonly mostrarDatos = signal(false);
  /** True mientras se guardan los datos. */
  protected readonly guardandoDatos = signal(false);
  /** Error de la última edición de datos. */
  protected readonly errorDatos = signal<string | null>(null);

  /** Posiciones calculadas de nodos y ramas del lienzo. */
  protected readonly distribucion = computed(() => {
    const s = this.subgrafo();
    return distribuir(s?.inicio ?? null, s?.nodos ?? []);
  });

  /** Nodos que son preguntas. */
  protected readonly preguntas = computed(() =>
    (this.subgrafo()?.nodos ?? []).filter(n => n.tipo === 'PREGUNTA')
  );

  /** True si el lienzo no tiene todavía una primera pregunta. */
  protected readonly vacio = computed(() => {
    const s = this.subgrafo();
    return !!s && !s.nodos.some(n => n.id === s.inicio);
  });

  private id!: number;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  /** Carga el borrador y la pregunta puente de su categoría. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.obtener(this.id).subscribe({
      next: s => {
        this.subgrafo.set(s);
        this.cargando.set(false);
        this.cargarPreguntaPuente(s.puenteId);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo abrir el subgrafo. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
    });
  }

  /** Resuelve el texto de la pregunta puente para el modal de publicar. */
  private cargarPreguntaPuente(puenteId: string): void {
    this.autoria.categorias().subscribe({
      next: categorias => this.preguntaPuente.set(categorias.find(c => c.puenteId === puenteId)?.pregunta ?? ''),
      error: () => { /* el modal de publicar simplemente no nombra la pregunta */ }
    });
  }

  // --- Abrir el panel -----------------------------------------------------------

  /** Abre el panel para crear la primera pregunta. */
  protected abrirPrimera(): void {
    this.abrir({ tipo: 'primera' }, null);
  }

  /** Abre el panel para editar un nodo. */
  protected abrirNodo(nodo: NodoLienzo): void {
    this.abrir({ tipo: 'editar', nodo }, nodo.id);
  }

  /** Abre el panel según lo que hay al final de una respuesta ("+", enlace o nodo). */
  protected abrirRama(rama: Rama): void {
    const origen = this.nodo(rama.origenId);
    if (!origen) return;
    if (rama.tipo === 'mas') {
      this.abrir({ tipo: 'mas', origen, respuesta: rama.respuesta }, rama.respuesta.id);
    } else if (rama.tipo === 'enlace' && rama.destinoId) {
      const destino = this.nodo(rama.destinoId);
      if (destino) {
        this.abrir({ tipo: 'enlace', origen, respuesta: rama.respuesta, destino }, rama.respuesta.id);
      }
    }
  }

  /** Al tocar un aviso: se abre lo que hay que corregir y se lleva a la vista. */
  protected irAAviso(aviso: Aviso): void {
    const rama = aviso.respuestaId
      ? this.distribucion().ramas.find(r => r.respuesta.id === aviso.respuestaId)
      : undefined;
    if (rama && rama.tipo !== 'nodo') {
      this.abrirRama(rama);
    } else if (aviso.nodoId) {
      const nodo = this.nodo(aviso.nodoId);
      if (nodo) this.abrirNodo(nodo);
    }
    const ref = this.resaltado();
    if (ref) {
      setTimeout(() => document.querySelector(`[data-ref="${ref}"]`)
        ?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }));
    }
  }

  /** Cierra el panel de nodo. */
  protected cerrarPanel(): void {
    this.contexto.set(null);
    this.resaltado.set(null);
    this.errorPanel.set(null);
  }

  /** Abre el panel con un contexto y resalta una referencia. */
  private abrir(contexto: ContextoPanel, resaltado: string | null): void {
    this.errorPanel.set(null);
    this.contexto.set(contexto);
    this.resaltado.set(resaltado);
  }

  /** Busca un nodo del borrador por id. */
  private nodo(id: string): NodoLienzo | undefined {
    return this.subgrafo()?.nodos.find(n => n.id === id);
  }

  // --- Operaciones del panel ----------------------------------------------------

  /** Crea un nodo (el "+") y redibuja el lienzo. */
  protected crear(request: NodoRequest): void {
    this.ejecutar(this.autoria.agregarNodo(this.id, request));
  }

  /** Edita un nodo y redibuja el lienzo. */
  protected guardar(evento: { nodoId: string; request: NodoRequest }): void {
    this.ejecutar(this.autoria.editarNodo(this.id, evento.nodoId, evento.request));
  }

  /** Abre la confirmación; el panel queda abierto detrás por si cancela. */
  protected eliminar(nodoId: string): void {
    const nodo = this.nodo(nodoId);
    if (nodo) {
      this.errorEliminar.set(null);
      this.porEliminar.set(nodo);
    }
  }

  /** Cancela el diálogo de eliminar. */
  protected cancelarEliminar(): void {
    this.porEliminar.set(null);
    this.errorEliminar.set(null);
  }

  /** Elimina el nodo confirmado y su rama. */
  protected confirmarEliminar(): void {
    const nodo = this.porEliminar();
    if (!nodo || this.eliminando()) {
      return;
    }
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    this.autoria.eliminarNodo(this.id, nodo.id).subscribe({
      next: s => {
        this.subgrafo.set(s);
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.cerrarPanel();
        this.avisar(nodo.tipo === 'CONCLUSION' ? 'Se eliminó la conclusión.' : 'Se eliminó la pregunta.');
      },
      error: e => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeDeError(e, 'No se pudo eliminar. Intenta de nuevo.'));
      }
    });
  }

  /** Texto del diálogo de eliminar: qué se borra y qué vuelve a ser un "+". */
  protected mensajeEliminar(nodo: NodoLienzo): string {
    const entradas = (this.subgrafo()?.nodos ?? [])
      .flatMap(n => n.respuestas)
      .filter(r => r.destino === nodo.id).length;
    const que = nodo.tipo === 'CONCLUSION'
      ? `la conclusión «${nodo.texto || 'sin mensaje'}»`
      : `la pregunta «${nodo.texto || 'sin texto'}» y lo que cuelga solo de ella`;
    const mas = entradas === 0 ? ''
      : entradas === 1 ? ' La respuesta que llevaba aquí volverá a ser un "+".'
      : ` Las ${entradas} respuestas que llevaban aquí volverán a ser un "+".`;
    return `Se eliminará ${que}.${mas}`;
  }

  /** Enlaza una respuesta a una pregunta existente (o la vuelve "+"). */
  protected enlazar(evento: { respuestaId: string; nodoId: string | null }): void {
    this.ejecutar(this.autoria.enlazar(this.id, evento.respuestaId, evento.nodoId));
  }

  /** Ejecuta una operación que devuelve el borrador completo y cierra el panel. */
  private ejecutar(operacion: Observable<SubgrafoDTO>): void {
    this.ocupado.set(true);
    this.errorPanel.set(null);
    operacion.subscribe({
      next: s => {
        this.subgrafo.set(s);
        this.ocupado.set(false);
        this.cerrarPanel();
      },
      error: e => {
        this.ocupado.set(false);
        this.errorPanel.set(mensajeDeError(e, 'No se pudo guardar el cambio. Intenta de nuevo.'));
      }
    });
  }

  // --- Publicar -----------------------------------------------------------------

  /** Abre el modal de publicar con los avisos actuales. */
  protected abrirPublicar(): void {
    this.errorPublicar.set(null);
    this.avisosPublicar.set(this.subgrafo()?.avisos ?? []);
    this.mostrarPublicar.set(true);
  }

  /** Publica el subgrafo; si hay avisos bloqueantes, los muestra en el modal. */
  protected publicar(): void {
    this.publicando.set(true);
    this.errorPublicar.set(null);
    this.autoria.publicar(this.id).subscribe({
      next: s => {
        this.subgrafo.set(s);
        this.publicando.set(false);
        this.mostrarPublicar.set(false);
        this.avisar('Publicado: las cuidadoras ya pueden recorrerlo.');
      },
      error: e => {
        this.publicando.set(false);
        const avisos = avisosDeError(e);
        if (avisos.length > 0) {
          this.avisosPublicar.set(avisos);
        }
        this.errorPublicar.set(mensajeDeError(e, 'No se pudo publicar. Intenta de nuevo.'));
      }
    });
  }

  // --- Datos del subgrafo --------------------------------------------------------

  /** Abre el modal de datos del subgrafo. */
  protected abrirDatos(): void {
    this.errorDatos.set(null);
    this.mostrarDatos.set(true);
  }

  /** Guarda el nombre y el nombre para la familia del subgrafo. */
  protected guardarDatos(datos: DatosSubgrafo): void {
    const s = this.subgrafo();
    if (!s) return;
    this.guardandoDatos.set(true);
    this.errorDatos.set(null);
    this.autoria.actualizar(this.id, {
      nombre: datos.nombre,
      puenteId: s.puenteId,
      etiquetaOpcion: datos.etiquetaOpcion,
      autor: s.autor ?? undefined,
      institucion: s.institucion ?? undefined
    }).subscribe({
      next: actualizado => {
        this.subgrafo.set(actualizado);
        this.guardandoDatos.set(false);
        this.mostrarDatos.set(false);
        this.avisar('Datos guardados.');
      },
      error: e => {
        this.guardandoDatos.set(false);
        this.errorDatos.set(mensajeDeError(e, 'No se pudieron guardar los datos. Intenta de nuevo.'));
      }
    });
  }

  // --- Vista --------------------------------------------------------------------

  /** Muestra un mensaje de confirmación que desaparece solo. */
  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) this.mensaje.set(null);
    }, 4000);
  }

  /** Tono de la etiqueta según el estado del borrador. */
  protected tonoEstado(s: SubgrafoDTO): 'calma' | 'aviso' | 'marca' {
    return s.estado === 'PUBLICADO' ? 'calma' : s.estado === 'CAMBIOS_SIN_PUBLICAR' ? 'aviso' : 'marca';
  }

  /** True si el nodo es la primera pregunta del lienzo. */
  protected esInicio(nodo: NodoLienzo): boolean {
    return nodo.id === this.subgrafo()?.inicio;
  }
}
