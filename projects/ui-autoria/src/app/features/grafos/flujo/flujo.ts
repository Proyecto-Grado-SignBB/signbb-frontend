import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { AutoriaService } from '../../../core/http/autoria';
import { AristaJson, DocumentoAutoria, EstadoGrafo, NodoJson, ValidacionDTO } from '../../../models/autoria.model';

/** Un nodo ya ubicado en la vista de flujo, con su severidad si es un desenlace. */
interface NodoFlujo {
  id: string;
  /**
   * Identifica esta tarjeta puntual en el tablero — normalmente igual a
   * `id`, salvo que el nodo se repita (ver construirVista): ahí cada copia
   * tiene su propio ocurrenciaId (p. ej. "consulta_abc__0", "..._1") para
   * que Angular y el menú de acciones las traten como tarjetas separadas,
   * aunque las acciones (editar/eliminar/marcar inicio) sigan operando
   * sobre el mismo `id` real.
   */
  ocurrenciaId: string;
  /** true si este mismo nodo se dibuja más de una vez en el tablero (ver construirVista y .node--repetido). */
  repetido: boolean;
  /** tipo real del nodo (pregunta/inicio/recomendacion/consulta médica/urgencia) — decide si es editable. */
  tipo: string;
  kind: string;
  texto: string;
  esDesenlace: boolean;
  severidad: 'normal' | 'priority' | 'urgent';
}

/**
 * Una línea del diagrama entre dos tarjetas ya posicionadas en el DOM, más la
 * etiqueta de la respuesta que la disparó. Las coordenadas son relativas a
 * la esquina superior izquierda de `.flow` (ver recalcularConectores) y se
 * recalculan después de cada render porque dependen del alto real de cada
 * tarjeta, que varía con el largo del texto.
 */
interface Conector {
  /** Atributo `d` de un <path> en ángulo recto: salida → punto medio → entrada. */
  d: string;
  etiquetaX: number;
  etiquetaY: number;
  etiqueta: string;
}

/** Pantalla 2: vista general del flujo de un grafo (solo lectura, con puntos de edición). */
@Component({
  selector: 'app-flujo',
  standalone: true,
  imports: [NgTemplateOutlet, SidebarAutoriaComponent, ModalPublicarComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './flujo.html',
  styleUrl: './flujo.scss'
})
export class FlujoComponent implements OnInit, AfterViewChecked, OnDestroy {
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly publicando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly mensajePublicacion = signal<string | null>(null);
  protected readonly mostrarConfirmarPublicar = signal(false);
  protected readonly validandoPublicar = signal(false);
  protected readonly validacionParaPublicar = signal<ValidacionDTO | null>(null);
  protected readonly conteoPreguntas = signal(0);
  protected readonly conteoReglas = signal(0);

  protected readonly nombreGrafo = signal('');
  protected readonly estadoGrafo = signal<EstadoGrafo>('Borrador');
  protected readonly columnas = signal<NodoFlujo[][]>([]);
  protected readonly huerfanos = signal<NodoFlujo[]>([]);
  protected readonly hayCiclos = signal(false);
  /** Líneas del diagrama entre tarjetas conectadas; ver recalcularConectores(). */
  protected readonly conectores = signal<Conector[]>([]);
  /** ocurrenciaId de la tarjeta cuyo menú de acciones (⋮) está abierto, o null si ninguno. */
  protected readonly menuAbiertoId = signal<string | null>(null);
  /** Posición en pantalla del panel de acciones abierto — ver toggleMenu(). */
  protected readonly menuPosicion = signal<{ top: number; left: number } | null>(null);
  protected readonly eliminando = signal(false);

  protected grafoId!: number;
  private documento: DocumentoAutoria | null = null;
  /** Aristas que unen dos nodos ya ubicados en columnas, en orden de profundidad creciente (ver construirVista). */
  private aristasParaDibujar: AristaJson[] = [];
  /** Ocurrencia (tarjeta dibujada) a la que apunta cada arista — ver construirVista() y recalcularConectores(). */
  private ocurrenciaPorArista = new Map<AristaJson, string>();
  /** Primera ocurrencia dibujada de cada nodo — para ubicar el ORIGEN de una línea (ver recalcularConectores()). */
  private primeraOcurrenciaPorNodo = new Map<string, string>();
  private temporizadorResize?: ReturnType<typeof setTimeout>;
  /** Observa el tamaño real de `.flow` para saber cuándo volver a medir las tarjetas — ver ngAfterViewChecked(). */
  private resizeObserver?: ResizeObserver;
  private flowElObservado: HTMLElement | null = null;

  /** Contenedor real de las columnas — se mide tras cada render para dibujar los conectores (ver recalcularConectores). */
  @ViewChild('flowEl') private flowEl?: ElementRef<HTMLElement>;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.grafoId = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargarGrafo();
  }

  /**
   * `.flow` (y las tarjetas dentro) aparece y desaparece del DOM según
   * `cargando()`/`columnas()` — cada vez que el elemento real cambia (incluida
   * la primera vez que existe), hay que reengancharle un ResizeObserver
   * nuevo. La ventaja frente a un simple setTimeout tras cargar el grafo
   * (que igual se deja como respaldo en construirVista): el observer avisa
   * justo cuando el navegador terminó de calcular el layout real, así que no
   * depende de adivinar cuánto tarda — antes, en la primera carga de la
   * pantalla, a veces el setTimeout corría antes de que el layout estuviera
   * listo y las líneas del diagrama no aparecían hasta la siguiente vez que
   * se recalculaba (p. ej. al volver de editar una pregunta).
   */
  ngAfterViewChecked(): void {
    const el = this.flowEl?.nativeElement ?? null;
    if (el !== this.flowElObservado) {
      this.resizeObserver?.disconnect();
      this.flowElObservado = el;
      if (el) {
        this.resizeObserver = new ResizeObserver(() => this.recalcularConectores());
        this.resizeObserver.observe(el);
      } else {
        this.conectores.set([]);
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearTimeout(this.temporizadorResize);
  }

  @HostListener('window:resize')
  protected onResize(): void {
    // Debounced: un redimensionado puede reflow-ear el texto de las tarjetas
    // y cambiar su alto, así que los conectores hay que recalcularlos — pero
    // no en cada pixel de un drag de ventana.
    clearTimeout(this.temporizadorResize);
    this.temporizadorResize = setTimeout(() => this.recalcularConectores(), 150);
  }

  protected cargarGrafo(): void {
    this.cargando.set(true);
    this.error.set(null);

    // obtener() trae el documento; validar() trae los huérfanos/ciclos que ya
    // calcula el backend; listar() es la única forma de saber el estado
    // (Publicado/Borrador) de este grafo puntual, porque el documento no lo trae.
    this.autoria.obtener(this.grafoId).subscribe({
      next: doc => {
        this.nombreGrafo.set(doc.nombre);
        this.documento = doc.documento;
        this.construirVista(doc.documento);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el grafo. Verifica que el backend esté disponible.');
        this.cargando.set(false);
      }
    });

    this.autoria.validar(this.grafoId).subscribe({
      next: (validacion: ValidacionDTO) => {
        this.hayCiclos.set(validacion.hayCiclos);
        if (this.documento) {
          this.marcarHuerfanos(validacion.nodosSueltos, this.documento);
        } else {
          // La validación puede volver antes que el documento; se recalcula
          // cuando construirVista() ya tenga el documento disponible.
          this.nodosSueltosPendientes = validacion.nodosSueltos;
        }
      },
      error: () => { /* la vista sigue siendo útil sin el resultado de validación */ }
    });

    this.autoria.listar().subscribe({
      next: grafos => {
        const resumen = grafos.find(g => g.id === this.grafoId);
        if (resumen) {
          this.estadoGrafo.set(resumen.estado);
          this.conteoPreguntas.set(resumen.conteoPreguntas);
          this.conteoReglas.set(resumen.conteoReglas);
        }
      },
      error: () => { /* el chip de estado simplemente no se muestra */ }
    });
  }

  private nodosSueltosPendientes: string[] | null = null;

  private construirVista(documento: DocumentoAutoria): void {
    const nodes = documento.graph.nodes;
    const edges = documento.graph.edges;

    const inicioId = Object.keys(nodes).find(id => nodes[id].metadata.tipo === 'inicio');
    if (!inicioId) {
      this.columnas.set([]);
      this.aristasParaDibujar = [];
      this.conectores.set([]);
      if (this.nodosSueltosPendientes) {
        this.marcarHuerfanos(this.nodosSueltosPendientes, documento);
      }
      return;
    }

    const porOrigen = new Map<string, AristaJson[]>();
    for (const arista of edges) {
      if (!porOrigen.has(arista.source)) {
        porOrigen.set(arista.source, []);
      }
      porOrigen.get(arista.source)!.push(arista);
    }

    // Profundidad de columna de cada nodo: NO es la distancia más corta
    // desde el inicio (un BFS simple, como estaba antes) sino la más larga.
    // Motivo: cuando dos preguntas distintas llevan al mismo desenlace (p. ej.
    // dos síntomas de alarma que ambos recomiendan "Consulta médica"), con la
    // distancia más corta ese desenlace queda ubicado en la columna de la
    // pregunta que lo alcanza primero — y la arista que viene de la pregunta
    // MÁS profunda termina apuntando hacia atrás o a su misma columna. Esa
    // arista no se puede dibujar como línea en ángulo recto hacia adelante,
    // así que el filtro de más abajo (nivelDestino > nivelOrigen) la
    // descartaba sin avisar: el camino existía en los datos, pero su línea
    // simplemente no aparecía en el diagrama. Con la distancia más larga,
    // cada nodo queda un paso después de TODOS sus predecesores, así que
    // toda arista real queda garantizada hacia adelante (salvo que haya un
    // ciclo de verdad, que ya se avisa aparte con hayCiclos()).
    const profundidad = new Map<string, number>();
    profundidad.set(inicioId, 0);
    const alcanzables = new Set<string>([inicioId]);
    const cola: string[] = [inicioId];
    while (cola.length > 0) {
      const actualId = cola.shift()!;
      for (const arista of porOrigen.get(actualId) ?? []) {
        if (!nodes[arista.target]) {
          continue; // arista colgante: se ignora acá, el backend la reporta en validación
        }
        if (!alcanzables.has(arista.target)) {
          alcanzables.add(arista.target);
          profundidad.set(arista.target, profundidad.get(actualId)! + 1);
          cola.push(arista.target);
        }
      }
    }

    // Relajación acotada (al estilo Bellman-Ford, pero solo "hacia
    // adelante"): empuja cada nodo a la profundidad de su predecesor más
    // profundo + 1. Como máximo una vuelta por nodo alcanzable alcanza para
    // cualquier grafo sin ciclos; si hay un ciclo real esto simplemente deja
    // de encontrar cambios o se detiene en el tope sin colgarse.
    for (let vuelta = 0; vuelta < alcanzables.size; vuelta++) {
      let huboCambio = false;
      for (const id of alcanzables) {
        for (const arista of porOrigen.get(id) ?? []) {
          if (!alcanzables.has(arista.target)) {
            continue;
          }
          const propuesta = profundidad.get(id)! + 1;
          if (propuesta > profundidad.get(arista.target)!) {
            profundidad.set(arista.target, propuesta);
            huboCambio = true;
          }
        }
      }
      if (!huboCambio) {
        break;
      }
    }

    // Solo se dibujan las aristas "hacia adelante" (destino en una columna
    // posterior a la del origen): un ciclo produciría una arista hacia una
    // columna igual o anterior, que no tiene una forma sensata de dibujarse
    // como línea en ángulo recto sin cruzar otras columnas. Esos casos ya se
    // avisan aparte con el mensaje de "este grafo tiene ciclos" (hayCiclos).
    this.aristasParaDibujar = edges.filter(arista => {
      const nivelOrigen = profundidad.get(arista.source);
      const nivelDestino = profundidad.get(arista.target);
      return nivelOrigen !== undefined && nivelDestino !== undefined && nivelDestino > nivelOrigen;
    });

    // Tarjetas a dibujar. Casi todos los nodos se dibujan una sola vez, en
    // la columna de `profundidad`. La excepción es un nodo al que llegan DOS
    // O MÁS aristas "hacia adelante" distintas (p. ej. dos preguntas de
    // alarma distintas que ambas recomiendan "Consulta médica"): en vez de
    // una sola tarjeta compartida con líneas largas cruzando el tablero, se
    // dibuja una copia por cada arista que llega a él, cada una pegada a la
    // columna de su propia pregunta de origen (profundidad del origen + 1).
    // Las copias comparten el mismo `id` real — editar, eliminar o marcar
    // como inicio desde cualquiera de ellas afecta a todas, porque es el
    // mismo nodo — pero cada una tiene su propio `ocurrenciaId` para que
    // Angular y el menú de acciones las traten como tarjetas separadas (ver
    // flujo.html y .node--repetido en flujo.scss). Nota: esto asume que un
    // nodo con más de una arista entrante no tiene a su vez aristas
    // salientes propias — cierto hoy, porque solo "pregunta"/"inicio" se
    // ramifican y los desenlaces son siempre hojas; si eso cambiara, los
    // hijos de un nodo repetido se dibujarían colgando de su primera copia
    // únicamente.
    const entrantesPorNodo = new Map<string, AristaJson[]>();
    for (const arista of this.aristasParaDibujar) {
      if (!entrantesPorNodo.has(arista.target)) {
        entrantesPorNodo.set(arista.target, []);
      }
      entrantesPorNodo.get(arista.target)!.push(arista);
    }

    const columnas: NodoFlujo[][] = [];
    this.ocurrenciaPorArista = new Map<AristaJson, string>();
    this.primeraOcurrenciaPorNodo = new Map<string, string>();

    columnas[0] = [this.aNodoFlujo(inicioId, documento)];
    this.primeraOcurrenciaPorNodo.set(inicioId, inicioId);

    for (const [targetId, entrantes] of entrantesPorNodo) {
      const repetido = entrantes.length > 1;
      entrantes.forEach((arista, indice) => {
        const columna = profundidad.get(arista.source)! + 1;
        const ocurrenciaId = repetido ? `${targetId}__${indice}` : targetId;
        this.ocurrenciaPorArista.set(arista, ocurrenciaId);
        if (!this.primeraOcurrenciaPorNodo.has(targetId)) {
          this.primeraOcurrenciaPorNodo.set(targetId, ocurrenciaId);
        }
        columnas[columna] ??= [];
        columnas[columna].push(this.aNodoFlujo(targetId, documento, ocurrenciaId, repetido));
      });
    }

    this.columnas.set(columnas);

    if (this.nodosSueltosPendientes) {
      this.marcarHuerfanos(this.nodosSueltosPendientes, documento);
    }

    // Las tarjetas todavía no están en el DOM con su alto final en este punto
    // (Angular recién va a renderizar las columnas) — se agenda la medición
    // para el siguiente ciclo, cuando `.flow` y las tarjetas ya existan.
    setTimeout(() => this.recalcularConectores());
  }

  private marcarHuerfanos(ids: string[], documento: DocumentoAutoria): void {
    this.nodosSueltosPendientes = null;
    const nodos = ids
      .filter(id => documento.graph.nodes[id])
      .map(id => this.aNodoFlujo(id, documento));
    this.huerfanos.set(nodos);
  }

  private aNodoFlujo(id: string, documento: DocumentoAutoria, ocurrenciaId: string = id, repetido = false): NodoFlujo {
    const nodo = documento.graph.nodes[id];
    const tipo = nodo.metadata.tipo;
    const esDesenlace = tipo !== 'inicio' && tipo !== 'pregunta';
    return {
      id,
      ocurrenciaId,
      repetido,
      tipo,
      kind: tipo === 'inicio' || tipo === 'pregunta' ? 'Pregunta' : this.capitalizar(tipo),
      texto: nodo.label,
      esDesenlace,
      severidad: esDesenlace ? this.severidadDeTipo(tipo) : 'normal'
    };
  }

  /**
   * Color de la tarjeta según el TIPO del nodo, no según qué regla lo
   * dispare — antes se coloreaba buscando la regla cuyo nodoDestino fuera
   * este nodo, así que un mismo tipo (ej. "consulta médica") podía salir
   * naranja o rojo según cuál regla apuntara a cada nodo puntual. Ahora es
   * fijo: recomendación siempre verde, consulta médica siempre naranja,
   * urgencia siempre rojo — sin importar las reglas.
   */
  private severidadDeTipo(tipo: string): 'normal' | 'priority' | 'urgent' {
    if (tipo === 'consulta médica') return 'priority';
    if (tipo === 'urgencia') return 'urgent';
    return 'normal'; // recomendacion (y cualquier otro tipo futuro) → verde
  }

  private capitalizar(texto: string): string {
    return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  }

  /**
   * Texto legible de una relación cruda del grafo (ej. "MENOS_DE_24_HORAS",
   * "SI") para mostrar en la pastilla sobre la línea del diagrama. "SI"/"NO"
   * son el caso más común y se corrigen a mano porque el acento de "Sí" se
   * pierde en el dato crudo; cualquier otra relación solo se despuntúa.
   */
  private etiquetaConector(relation: string): string {
    const limpio = relation.trim();
    if (limpio.toUpperCase() === 'SI') return 'Sí';
    if (limpio.toUpperCase() === 'NO') return 'No';
    const texto = limpio.replace(/_/g, ' ').toLowerCase();
    return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  }

  /**
   * Mide la posición real de cada tarjeta dentro de `.flow` y arma las
   * líneas en ángulo recto (salida de la tarjeta origen → punto medio →
   * entrada de la tarjeta destino) más la etiqueta de la respuesta, en
   * coordenadas relativas a `.flow` mismo — por eso el resultado es válido
   * sin importar la posición de scroll de `.diagram-scroll` (ver flujo.html):
   * tanto `.flow` como sus tarjetas se desplazan juntos, así que la
   * diferencia entre sus posiciones no cambia al desplazar.
   *
   * Se llama después de cada render de las columnas (ver construirVista) y
   * en cada resize de ventana, porque el alto de una tarjeta depende de
   * cuánto ocupe su texto una vez que el navegador lo envuelve.
   */
  private recalcularConectores(): void {
    const flowEl = this.flowEl?.nativeElement;
    if (!flowEl || this.aristasParaDibujar.length === 0) {
      this.conectores.set([]);
      return;
    }

    const flowRect = flowEl.getBoundingClientRect();
    const porOcurrencia = new Map<string, DOMRect>();
    flowEl.querySelectorAll<HTMLElement>('[data-ocurrencia-id]').forEach(el => {
      const ocurrenciaId = el.dataset['ocurrenciaId'];
      if (ocurrenciaId) {
        porOcurrencia.set(ocurrenciaId, el.getBoundingClientRect());
      }
    });

    const conectores: Conector[] = [];
    for (const arista of this.aristasParaDibujar) {
      const ocurrenciaOrigen = this.primeraOcurrenciaPorNodo.get(arista.source) ?? arista.source;
      const ocurrenciaDestino = this.ocurrenciaPorArista.get(arista);
      if (!ocurrenciaDestino) {
        continue; // no debería pasar: toda arista de aristasParaDibujar generó una ocurrencia en construirVista
      }
      const rectoOrigen = porOcurrencia.get(ocurrenciaOrigen);
      const rectoDestino = porOcurrencia.get(ocurrenciaDestino);
      if (!rectoOrigen || !rectoDestino) {
        continue; // la tarjeta todavía no está en el DOM (debería ser raro)
      }
      const sx = rectoOrigen.right - flowRect.left;
      const sy = rectoOrigen.top + rectoOrigen.height / 2 - flowRect.top;
      const tx = rectoDestino.left - flowRect.left;
      const ty = rectoDestino.top + rectoDestino.height / 2 - flowRect.top;
      const midx = (sx + tx) / 2;
      conectores.push({
        d: `M${sx},${sy} H${midx} V${ty} H${tx}`,
        etiquetaX: midx,
        etiquetaY: (sy + ty) / 2,
        etiqueta: this.etiquetaConector(arista.relation)
      });
    }
    this.conectores.set(conectores);
  }

  protected volverAlTablero(): void {
    this.router.navigate(['/grafos']);
  }

  /**
   * Si una tarjeta se puede abrir para editar: preguntas comunes y
   * desenlaces sí; el nodo de inicio todavía no (ver abrirNodo()).
   */
  protected puedeEditar(nodo: NodoFlujo): boolean {
    return nodo.tipo === 'pregunta' || nodo.tipo === 'inicio' || nodo.esDesenlace;
  }

  /**
   * Abre la pantalla de edición que corresponda al tipo del nodo. El nodo
   * de inicio (tipo "inicio") queda fuera a propósito: editarPregunta en el
   * backend fija metadata.tipo="pregunta" sin excepción (ver
   * ServicioAutoriaImpl.construirNodoPregunta), así que editar el texto del
   * inicio por ese camino le quitaría la marca de inicio y rompería esta
   * misma vista (construirVista busca el nodo con tipo "inicio"). Falta
   * decidir si eso se resuelve editando aquí con el puente de "guardar" o
   * arreglando el backend para que no pise el tipo al editar.
   */
  protected abrirNodo(nodo: NodoFlujo): void {
    if (nodo.tipo === 'pregunta' || nodo.tipo === 'inicio') {
      this.router.navigate(['/grafos', this.grafoId, 'preguntas', nodo.id]);
    } else if (nodo.esDesenlace) {
      this.router.navigate(['/grafos', this.grafoId, 'desenlaces', nodo.id]);
    }
  }

  protected agregarPregunta(): void {
    this.router.navigate(['/grafos', this.grafoId, 'preguntas', 'nueva']);
  }

  protected agregarDesenlace(): void {
    this.router.navigate(['/grafos', this.grafoId, 'desenlaces', 'nuevo']);
  }

  /**
   * Abre/cierra el menú de acciones (⋮) de una tarjeta.
   *
   * El panel se posiciona con `position:fixed`, calculado a mano a partir
   * del botón que lo abrió, en vez de `position:absolute` anclado a la
   * tarjeta. Razón: el área del diagrama (`.diagram-scroll`) tiene scroll
   * horizontal, y cualquier ancestro con overflow distinto de "visible"
   * recorta todo lo que se salga de su caja — con absolute, el panel podía
   * aparecer cortado (sin el botón "Eliminar") o, peor, con la parte
   * recortada invisible tapando otra tarjeta y recibiendo el clic que el
   * médico creía estar dando sobre una opción del menú. `position:fixed` se
   * ubica contra la ventana del navegador, no contra ese contenedor, así que
   * ningún scroll intermedio lo recorta.
   */
  protected toggleMenu(ocurrenciaId: string, evento: Event): void {
    evento.stopPropagation();
    if (this.menuAbiertoId() === ocurrenciaId) {
      this.cerrarMenu();
      return;
    }
    const boton = evento.currentTarget as HTMLElement;
    const rect = boton.getBoundingClientRect();
    const anchoMenu = 180;
    const altoEstimado = 140; // generoso: hasta 3 botones + separador + padding
    let top = rect.bottom + 6;
    if (top + altoEstimado > window.innerHeight) {
      top = Math.max(8, rect.top - altoEstimado - 6); // no cabe debajo: se abre hacia arriba
    }
    this.menuPosicion.set({ top, left: Math.max(8, rect.right - anchoMenu) });
    this.menuAbiertoId.set(ocurrenciaId);
  }

  protected cerrarMenu(): void {
    this.menuAbiertoId.set(null);
    this.menuPosicion.set(null);
  }

  /**
   * Elimina una pregunta desde su menú de acciones, usando el endpoint
   * tipado que ya existe para esto (DELETE /preguntas/{nodoId} — a
   * diferencia de "marcar como inicio", aquí sí hay un endpoint granular
   * dedicado). Tras eliminar se recarga todo el grafo porque pueden cambiar
   * huérfanos, columnas y aristas colgantes.
   */
  protected eliminarPregunta(nodo: NodoFlujo): void {
    this.cerrarMenu();
    if (nodo.tipo !== 'pregunta' || this.eliminando()) {
      return;
    }
    const confirmado = confirm(
      `¿Eliminar la pregunta "${nodo.texto}"? También se eliminan las conexiones hacia y desde ella.`
    );
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);
    this.autoria.eliminarPregunta(this.grafoId, nodo.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cargarGrafo();
      },
      error: () => {
        this.eliminando.set(false);
        this.error.set('No se pudo eliminar la pregunta.');
      }
    });
  }

  /**
   * Elimina un desenlace desde su menú de acciones. No hay endpoint tipado
   * para desenlaces (igual que en DesenlaceEditorComponent), así que se usa
   * el mismo puente de "guardar" documento completo: se quita el nodo y
   * cualquier arista que lo tuviera como origen o destino.
   */
  protected eliminarDesenlace(nodo: NodoFlujo): void {
    this.cerrarMenu();
    if (!this.documento || !nodo.esDesenlace || this.eliminando()) {
      return;
    }
    const confirmado = confirm(
      `¿Eliminar este desenlace? Las preguntas que apuntaban a él quedarán sin ese destino.`
    );
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);
    const nodoId = nodo.id;
    const { [nodoId]: _eliminado, ...restoNodos } = this.documento.graph.nodes;
    const documento: DocumentoAutoria = {
      ...this.documento,
      graph: {
        ...this.documento.graph,
        nodes: restoNodos,
        edges: this.documento.graph.edges.filter(a => a.target !== nodoId && a.source !== nodoId)
      }
    };
    this.autoria.guardar(this.grafoId, documento).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.documento = documento;
        this.cargarGrafo();
      },
      error: () => {
        this.eliminando.set(false);
        this.error.set('No se pudo eliminar el desenlace.');
      }
    });
  }

  /**
   * Marca un nodo pregunta existente como el inicio del recorrido.
   *
   * No hay endpoint tipado para esto (ver la nota al backend, punto 1), así
   * que se hace a mano sobre el documento completo y se guarda con el mismo
   * puente que usa el botón "Guardar": GrafoClinico.agregarNodo() decide el
   * nodo inicial por orden de inserción (el primero que se agrega queda como
   * inicial), así que hay que reordenar las claves de `nodes` para que el
   * elegido quede primero. También se ajusta metadata.tipo porque esta misma
   * pantalla arma el mapa de flujo buscando el nodo cuyo tipo sea "inicio"
   * (ver construirVista) — sin este segundo cambio la vista seguiría
   * mostrando el inicio anterior aunque el backend ya use el nuevo.
   */
  protected marcarComoInicio(nodo: NodoFlujo): void {
    this.cerrarMenu();
    if (!this.documento || nodo.tipo !== 'pregunta' || this.guardando()) {
      return;
    }
    const confirmado = confirm(
      `¿Marcar "${nodo.texto}" como el nuevo inicio del recorrido? Esto reemplaza al inicio actual y ` +
      'solo se aplica cuando publiques.'
    );
    if (!confirmado) {
      return;
    }

    const nodesActuales = this.documento.graph.nodes;
    const inicioActualId = Object.keys(nodesActuales).find(id => nodesActuales[id].metadata.tipo === 'inicio');

    const nodosReordenados: Record<string, NodoJson> = {
      [nodo.id]: { ...nodesActuales[nodo.id], metadata: { ...nodesActuales[nodo.id].metadata, tipo: 'inicio' } }
    };
    for (const id of Object.keys(nodesActuales)) {
      if (id === nodo.id) {
        continue;
      }
      if (id === inicioActualId) {
        nodosReordenados[id] = { ...nodesActuales[id], metadata: { ...nodesActuales[id].metadata, tipo: 'pregunta' } };
      } else {
        nodosReordenados[id] = nodesActuales[id];
      }
    }

    const documento: DocumentoAutoria = {
      ...this.documento,
      graph: { ...this.documento.graph, nodes: nodosReordenados }
    };

    this.guardando.set(true);
    this.autoria.guardar(this.grafoId, documento).subscribe({
      next: () => {
        this.documento = documento;
        this.guardando.set(false);
        this.construirVista(documento);
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo marcar el nuevo inicio.');
      }
    });
  }

  protected guardar(): void {
    if (!this.documento || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.autoria.guardar(this.grafoId, this.documento).subscribe({
      next: () => this.guardando.set(false),
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar el grafo.');
      }
    });
  }

  /** Abre el modal de confirmación (Pantalla 5) y recalcula las advertencias estructurales al vuelo. */
  protected abrirConfirmarPublicar(): void {
    this.mostrarConfirmarPublicar.set(true);
    this.validandoPublicar.set(true);
    this.validacionParaPublicar.set(null);
    this.autoria.validar(this.grafoId).subscribe({
      next: validacion => {
        this.validacionParaPublicar.set(validacion);
        this.validandoPublicar.set(false);
      },
      error: () => {
        this.validandoPublicar.set(false);
      }
    });
  }

  protected cerrarConfirmarPublicar(): void {
    this.mostrarConfirmarPublicar.set(false);
  }

  protected publicar(): void {
    if (this.publicando()) {
      return;
    }
    this.publicando.set(true);
    this.mensajePublicacion.set(null);
    this.autoria.publicar(this.grafoId).subscribe({
      next: resultado => {
        this.publicando.set(false);
        this.mostrarConfirmarPublicar.set(false);
        this.estadoGrafo.set(resultado.estado);
        this.mensajePublicacion.set(
          resultado.advertencias.length > 0
            ? `Publicado con advertencias: ${resultado.advertencias.join('; ')}`
            : 'Publicado correctamente. Los cuidadores ya ven esta versión.'
        );
      },
      error: () => {
        this.publicando.set(false);
        this.error.set('El grafo no se pudo publicar porque no es válido. Revisa la estructura.');
      }
    });
  }
}
