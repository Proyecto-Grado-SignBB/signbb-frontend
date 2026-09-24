import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { AutoriaService } from '../../../core/http/autoria';
import { AristaJson, DocumentoAutoria, EstadoGrafo, ValidacionDTO } from '../../../models/autoria.model';

/** Un nodo ya ubicado en la vista de flujo, con su severidad si es un desenlace. */
interface NodoFlujo {
  id: string;
  /** tipo real del nodo (pregunta/inicio/recomendacion/consulta_medica/bloqueo) — decide si es editable. */
  tipo: string;
  kind: string;
  texto: string;
  esDesenlace: boolean;
  severidad: 'normal' | 'priority' | 'urgent';
  etiquetaEntrada: string | null;
}

/** Pantalla 2: vista general del flujo de un grafo (solo lectura, con puntos de edición). */
@Component({
  selector: 'app-flujo',
  standalone: true,
  imports: [SidebarAutoriaComponent, ModalPublicarComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './flujo.html',
  styleUrl: './flujo.scss'
})
export class FlujoComponent implements OnInit {
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

  protected grafoId!: number;
  private documento: DocumentoAutoria | null = null;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.grafoId = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargarGrafo();
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

    const profundidad = new Map<string, number>();
    const etiquetasEntrada = new Map<string, Set<string>>();
    profundidad.set(inicioId, 0);
    const cola: string[] = [inicioId];
    while (cola.length > 0) {
      const actualId = cola.shift()!;
      const nivel = profundidad.get(actualId)!;
      for (const arista of porOrigen.get(actualId) ?? []) {
        if (!nodes[arista.target]) {
          continue; // arista colgante: se ignora acá, el backend la reporta en validación
        }
        if (!etiquetasEntrada.has(arista.target)) {
          etiquetasEntrada.set(arista.target, new Set());
        }
        etiquetasEntrada.get(arista.target)!.add(arista.relation);
        if (!profundidad.has(arista.target)) {
          profundidad.set(arista.target, nivel + 1);
          cola.push(arista.target);
        }
      }
    }

    const columnas: NodoFlujo[][] = [];
    for (const [id, nivel] of profundidad) {
      columnas[nivel] ??= [];
      const etiquetas = etiquetasEntrada.get(id);
      columnas[nivel].push(this.aNodoFlujo(id, documento, etiquetas ? [...etiquetas] : null));
    }
    this.columnas.set(columnas);

    if (this.nodosSueltosPendientes) {
      this.marcarHuerfanos(this.nodosSueltosPendientes, documento);
    }
  }

  private marcarHuerfanos(ids: string[], documento: DocumentoAutoria): void {
    this.nodosSueltosPendientes = null;
    const nodos = ids
      .filter(id => documento.graph.nodes[id])
      .map(id => this.aNodoFlujo(id, documento, null));
    this.huerfanos.set(nodos);
  }

  private aNodoFlujo(id: string, documento: DocumentoAutoria, etiquetas: string[] | null): NodoFlujo {
    const nodo = documento.graph.nodes[id];
    const tipo = nodo.metadata.tipo;
    const esDesenlace = tipo !== 'inicio' && tipo !== 'pregunta';
    return {
      id,
      tipo,
      kind: tipo === 'inicio' || tipo === 'pregunta' ? 'Pregunta' : this.capitalizar(tipo),
      texto: nodo.label,
      esDesenlace,
      severidad: esDesenlace ? this.severidadDeDestino(id, documento) : 'normal',
      etiquetaEntrada: etiquetas && etiquetas.length > 0
        ? etiquetas.map(e => this.formatoEtiqueta(e)).join(' / ')
        : null
    };
  }

  private severidadDeDestino(nodoId: string, documento: DocumentoAutoria): 'normal' | 'priority' | 'urgent' {
    for (const regla of Object.values(documento.rules)) {
      if (regla.nodoDestino === nodoId) {
        if (regla.nivel === 'URGENCIA') return 'urgent';
        if (regla.nivel === 'CONSULTAR_MEDICO') return 'priority';
      }
    }
    return 'normal';
  }

  private capitalizar(texto: string): string {
    return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  }

  private formatoEtiqueta(relacion: string): string {
    if (relacion === 'SI') return 'Sí';
    if (relacion === 'NO') return 'No';
    return relacion;
  }

  protected volverAlTablero(): void {
    this.router.navigate(['/grafos']);
  }

  /** Solo los nodos tipo "pregunta" son editables aquí — ver la nota en PreguntaEditorComponent. */
  protected editarPregunta(nodo: NodoFlujo): void {
    if (nodo.tipo !== 'pregunta') {
      return;
    }
    this.router.navigate(['/grafos', this.grafoId, 'preguntas', nodo.id]);
  }

  protected agregarPregunta(): void {
    this.router.navigate(['/grafos', this.grafoId, 'preguntas', 'nueva']);
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
