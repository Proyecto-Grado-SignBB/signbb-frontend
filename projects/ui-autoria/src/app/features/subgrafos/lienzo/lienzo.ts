import { ChangeDetectorRef, Component, ElementRef, OnInit, computed, effect, signal, viewChild } from '@angular/core';
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
import {
  ESCALA,
  MINIMAPA,
  areaVisible,
  centrarEn,
  escalaMinimapa,
  escalaParaAjustar,
  factorDeRueda,
  limitarEscala,
  noCabeEnLaVista,
  zoomEnPunto
} from './vista';

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
  protected readonly medidas = MEDIDAS;
  protected readonly etiquetaDesenlace = ETIQUETA_DESENLACE;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly nombreCategoria = nombreCategoria;

  protected readonly subgrafo = signal<SubgrafoDTO | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly contexto = signal<ContextoPanel | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly errorPanel = signal<string | null>(null);
  /** Id del nodo o de la respuesta resaltada (al tocar un aviso o al abrir el panel). */
  protected readonly resaltado = signal<string | null>(null);

  protected readonly mostrarPublicar = signal(false);
  protected readonly publicando = signal(false);
  protected readonly errorPublicar = signal<string | null>(null);
  protected readonly avisosPublicar = signal<Aviso[]>([]);
  protected readonly preguntaPuente = signal('');
  protected readonly mensaje = signal<string | null>(null);

  /** Nodo que el médico pidió eliminar (diálogo abierto), o null. */
  protected readonly porEliminar = signal<NodoLienzo | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  /** Diálogo de «Descartar cambios» abierto. */
  protected readonly mostrarDescartar = signal(false);
  protected readonly descartando = signal(false);
  protected readonly errorDescartar = signal<string | null>(null);

  protected readonly mostrarDatos = signal(false);
  protected readonly guardandoDatos = signal(false);
  protected readonly errorDatos = signal<string | null>(null);

  protected readonly distribucion = computed(() => {
    const s = this.subgrafo();
    return distribuir(s?.inicio ?? null, s?.nodos ?? []);
  });

  protected readonly preguntas = computed(() =>
    (this.subgrafo()?.nodos ?? []).filter(n => n.tipo === 'PREGUNTA')
  );

  protected readonly vacio = computed(() => {
    const s = this.subgrafo();
    return !!s && !s.nodos.some(n => n.id === s.inicio);
  });

  // --- Zoom, arrastre y mini-mapa -----------------------------------------------

  /** Zoom actual (1 = 100 %). Se conserva mientras el médico edita. */
  protected readonly escala = signal(1);
  protected readonly porcentaje = computed(() => Math.round(this.escala() * 100));
  protected readonly puedeAcercar = computed(() => this.escala() < ESCALA.max - 0.001);
  protected readonly puedeAlejar = computed(() => this.escala() > ESCALA.min + 0.001);
  /** true mientras el médico arrastra el fondo para moverse. */
  protected readonly arrastrando = signal(false);

  /** Desplazamiento y tamaño de la ventana del lienzo, para ubicar el mini-mapa. */
  private readonly medidaVista = signal({ izquierda: 0, arriba: 0, ancho: 0, alto: 0 });
  private readonly zona = viewChild<ElementRef<HTMLElement>>('scroll');

  /** Mini-mapa: solo aparece si el lienzo, con el zoom actual, no cabe en la ventana. */
  protected readonly minimapa = computed(() => {
    const d = this.distribucion();
    const v = this.medidaVista();
    const e = this.escala();
    if (v.ancho === 0 || !noCabeEnLaVista(d.ancho, d.alto, e, v.ancho, v.alto)) {
      return null;
    }
    const m = escalaMinimapa(d.ancho, d.alto, MINIMAPA.ancho, MINIMAPA.alto);
    return {
      escala: m,
      ancho: d.ancho * m,
      alto: d.alto * m,
      contenidoAncho: d.ancho,
      contenidoAlto: d.alto,
      area: areaVisible(v.izquierda, v.arriba, v.ancho, v.alto, e, d.ancho, d.alto)
    };
  });

  private arrastre: { x: number; y: number; izquierda: number; arriba: number; puntero: number } | null = null;
  private arrastrandoMinimapa = false;

  private id!: number;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute,
    private cambios: ChangeDetectorRef
  ) {
    // Mide la ventana del lienzo cuando aparece y cada vez que cambia de tamaño
    // (por ejemplo, al abrir o cerrar el panel de la derecha).
    effect(limpiar => {
      const el = this.zona()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(() => this.medirVista());
      observador.observe(el);
      limpiar(() => observador.disconnect());
    });
  }

  ngOnInit(): void {
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  protected cargar(): void {
    // Una dirección como /subgrafos/abc no tiene a qué subgrafo apuntar: no vale la pena preguntarle al servidor.
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.error.set('Ese subgrafo no existe. Vuelve a «Subgrafos» y elige uno de la lista.');
      this.cargando.set(false);
      return;
    }
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

  private cargarPreguntaPuente(puenteId: string): void {
    this.autoria.categorias().subscribe({
      next: categorias => this.preguntaPuente.set(categorias.find(c => c.puenteId === puenteId)?.pregunta ?? ''),
      error: () => { /* el modal de publicar simplemente no nombra la pregunta */ }
    });
  }

  // --- Abrir el panel -----------------------------------------------------------

  protected abrirPrimera(): void {
    this.abrir({ tipo: 'primera' }, null);
  }

  protected abrirNodo(nodo: NodoLienzo): void {
    this.abrir({ tipo: 'editar', nodo }, nodo.id);
  }

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

  protected cerrarPanel(): void {
    this.contexto.set(null);
    this.resaltado.set(null);
    this.errorPanel.set(null);
  }

  private abrir(contexto: ContextoPanel, resaltado: string | null): void {
    this.errorPanel.set(null);
    this.contexto.set(contexto);
    this.resaltado.set(resaltado);
  }

  private nodo(id: string): NodoLienzo | undefined {
    return this.subgrafo()?.nodos.find(n => n.id === id);
  }

  // --- Operaciones del panel ----------------------------------------------------

  protected crear(request: NodoRequest): void {
    this.ejecutar(this.autoria.agregarNodo(this.id, request));
  }

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

  protected cancelarEliminar(): void {
    this.porEliminar.set(null);
    this.errorEliminar.set(null);
  }

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

  protected enlazar(evento: { respuestaId: string; nodoId: string | null }): void {
    this.ejecutar(this.autoria.enlazar(this.id, evento.respuestaId, evento.nodoId));
  }

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

  protected abrirPublicar(): void {
    this.errorPublicar.set(null);
    this.avisosPublicar.set(this.subgrafo()?.avisos ?? []);
    this.mostrarPublicar.set(true);
  }

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

  // --- Descartar cambios --------------------------------------------------------

  protected abrirDescartar(): void {
    if (!this.subgrafo()?.puedeDescartar) return;
    this.errorDescartar.set(null);
    this.mostrarDescartar.set(true);
  }

  protected cancelarDescartar(): void {
    if (!this.descartando()) this.mostrarDescartar.set(false);
  }

  protected confirmarDescartar(): void {
    this.descartando.set(true);
    this.errorDescartar.set(null);
    this.autoria.descartar(this.id).subscribe({
      next: s => {
        this.subgrafo.set(s);
        this.descartando.set(false);
        this.mostrarDescartar.set(false);
        this.resaltado.set(null);
        this.cerrarPanel();
        this.cargarPreguntaPuente(s.puenteId);
        this.avisar('Cambios descartados: el subgrafo volvió a como está publicado.');
      },
      error: e => {
        this.descartando.set(false);
        this.errorDescartar.set(mensajeDeError(e, 'No se pudieron descartar los cambios. Intenta de nuevo.'));
      }
    });
  }

  // --- Datos del subgrafo --------------------------------------------------------

  protected abrirDatos(): void {
    this.errorDatos.set(null);
    this.mostrarDatos.set(true);
  }

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

  // --- Zoom y movimiento --------------------------------------------------------

  protected acercar(): void {
    this.cambiarEscala(this.escala() * ESCALA.paso);
  }

  protected alejar(): void {
    this.cambiarEscala(this.escala() / ESCALA.paso);
  }

  protected restablecer(): void {
    this.cambiarEscala(1);
  }

  /** Ajusta el zoom para ver todo el lienzo y vuelve a su esquina superior izquierda. */
  protected ajustar(): void {
    const el = this.zona()?.nativeElement;
    if (!el) return;
    const d = this.distribucion();
    this.cambiarEscala(escalaParaAjustar(d.ancho, d.alto, el.clientWidth, el.clientHeight));
    el.scrollTo({ left: 0, top: 0 });
    this.medirVista();
  }

  /** Ctrl + rueda (o el pellizco del trackpad) hace zoom sobre el cursor; la rueda sola se desplaza. */
  protected alRueda(evento: WheelEvent): void {
    if (!evento.ctrlKey && !evento.metaKey) return;
    const el = this.zona()?.nativeElement;
    if (!el) return;
    evento.preventDefault();
    const caja = el.getBoundingClientRect();
    this.cambiarEscala(
      this.escala() * factorDeRueda(evento.deltaY, evento.deltaMode),
      { x: evento.clientX - caja.left, y: evento.clientY - caja.top }
    );
  }

  protected alScroll(): void {
    this.medirVista();
  }

  /** Cambia el zoom conservando lo que hay bajo `punto` (por defecto, el centro de la ventana). */
  private cambiarEscala(deseada: number, punto?: { x: number; y: number }): void {
    const el = this.zona()?.nativeElement;
    const antes = this.escala();
    const despues = limitarEscala(deseada);
    if (despues === antes) return;
    const origen = punto ?? { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
    const destino = el ? zoomEnPunto(antes, despues, el.scrollLeft, el.scrollTop, origen.x, origen.y) : null;
    this.escala.set(despues);
    if (el && destino) {
      // El contenedor tiene que crecer o encogerse ya, o el navegador recortaría el desplazamiento.
      this.cambios.detectChanges();
      el.scrollTo({ left: destino.izquierda, top: destino.arriba });
    }
    this.medirVista();
  }

  private medirVista(): void {
    const el = this.zona()?.nativeElement;
    if (!el) return;
    this.medidaVista.set({
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      ancho: el.clientWidth,
      alto: el.clientHeight
    });
  }

  /** Arrastrar el fondo con el ratón mueve el lienzo (sobre una tarjeta o un botón no). */
  protected alPulsar(evento: PointerEvent): void {
    if (evento.pointerType !== 'mouse' || evento.button !== 0) return;
    const el = this.zona()?.nativeElement;
    const objetivo = evento.target as HTMLElement | null;
    if (!el || !objetivo || objetivo.closest('button')) return;
    // Un clic sobre las barras de desplazamiento es del navegador, no un arrastre.
    if (objetivo === el && (evento.offsetX >= el.clientWidth || evento.offsetY >= el.clientHeight)) return;
    this.arrastre = {
      x: evento.clientX,
      y: evento.clientY,
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      puntero: evento.pointerId
    };
    el.setPointerCapture(evento.pointerId);
    this.arrastrando.set(true);
  }

  protected alMover(evento: PointerEvent): void {
    const a = this.arrastre;
    const el = this.zona()?.nativeElement;
    if (!a || !el || evento.pointerId !== a.puntero) return;
    el.scrollTo({ left: a.izquierda - (evento.clientX - a.x), top: a.arriba - (evento.clientY - a.y) });
  }

  protected alSoltar(): void {
    this.arrastre = null;
    this.arrastrando.set(false);
  }

  /** Tocar o arrastrar sobre el mini-mapa lleva la ventana a esa zona. */
  protected alPulsarMinimapa(evento: PointerEvent): void {
    if (evento.button !== 0) return;
    (evento.currentTarget as Element).setPointerCapture(evento.pointerId);
    this.arrastrandoMinimapa = true;
    this.irDesdeMinimapa(evento);
  }

  protected alMoverMinimapa(evento: PointerEvent): void {
    if (this.arrastrandoMinimapa) this.irDesdeMinimapa(evento);
  }

  protected alSoltarMinimapa(): void {
    this.arrastrandoMinimapa = false;
  }

  private irDesdeMinimapa(evento: PointerEvent): void {
    const m = this.minimapa();
    const el = this.zona()?.nativeElement;
    if (!m || !el) return;
    const caja = (evento.currentTarget as Element).getBoundingClientRect();
    const destino = centrarEn(
      (evento.clientX - caja.left) / m.escala,
      (evento.clientY - caja.top) / m.escala,
      this.escala(),
      el.clientWidth,
      el.clientHeight
    );
    el.scrollTo({ left: destino.izquierda, top: destino.arriba });
  }

  // --- Vista --------------------------------------------------------------------

  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) this.mensaje.set(null);
    }, 4000);
  }

  protected tonoEstado(s: SubgrafoDTO): 'calma' | 'aviso' | 'marca' {
    return s.estado === 'PUBLICADO' ? 'calma' : s.estado === 'CAMBIOS_SIN_PUBLICAR' ? 'aviso' : 'marca';
  }

  protected esInicio(nodo: NodoLienzo): boolean {
    return nodo.id === this.subgrafo()?.inicio;
  }
}
