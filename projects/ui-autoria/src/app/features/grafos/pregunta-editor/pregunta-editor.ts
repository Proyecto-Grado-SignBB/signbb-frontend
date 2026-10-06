import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { AutoriaService } from '../../../core/http/autoria';
import { DocumentoAutoria, EstadoGrafo, NodoJson, PreguntaRequest, ValidacionDTO } from '../../../models/autoria.model';

type Severidad = 'leve' | 'moderado' | 'urgente';

/**
 * La severidad se guarda como un peso de 1 a 3 (metadata.peso): Leve=1,
 * Moderado=2, Urgente=3. Es la escala que exige el backend al cargar un
 * grafo (GrafoClinicoMapper). El motor de navegación usa el peso del destino
 * para ordenar la cola de opciones pendientes cuando el cuidador marca varias
 * opciones a la vez (MotorNavegacion.ordenCola): a igual tipo de terminal,
 * se sigue primero la de mayor peso, y a igual peso la que se marcó antes.
 * Al editar una pregunta con un peso fuera de la escala (ej. datos antiguos
 * sembrados con peso=85), se selecciona el nivel más cercano.
 */
const PESO_POR_SEVERIDAD: Record<Severidad, number> = { leve: 1, moderado: 2, urgente: 3 };

interface OpcionForm {
  etiqueta: string;
  destinoId: string;
}

interface NodoResumen {
  id: string;
  texto: string;
  kind: string;
}

/**
 * Pantalla 3: crear/editar una pregunta del grafo. Formulario a la izquierda,
 * vista en vivo de dónde queda conectada a la derecha.
 *
 * Importante: crearPregunta/editarPregunta en el backend SIEMPRE marcan el
 * nodo resultante como metadata.tipo="pregunta" (ver
 * ServicioAutoriaImpl.construirNodoPregunta). Un desenlace
 * (recomendacion/consulta médica/urgencia) no se edita aquí — tiene su propia
 * pantalla (DesenlaceEditorComponent) — así que esta sigue rechazando esos
 * tipos (ver la validación en cargar()).
 *
 * El nodo de inicio si se puede editar aquí, pero NO a través del endpoint
 * tipado de arriba: si se hiciera, le quitaría la marca de inicio sin avisar
 * (rompiendo flujo.ts, que arma la vista buscando el nodo con tipo "inicio").
 * Por eso, cuando el nodo cargado es el inicio, guardarPregunta() usa en su
 * lugar el mismo puente de "guardar" documento completo que ya usan el
 * editor de desenlace y "marcar como inicio" — ver guardarInicioViaPuente().
 * Por la misma razón no se ofrece eliminar el nodo de inicio desde aquí.
 */
@Component({
  selector: 'app-pregunta-editor',
  standalone: true,
  imports: [FormsModule, SidebarAutoriaComponent, ModalPublicarComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './pregunta-editor.html',
  styleUrl: './pregunta-editor.scss'
})
export class PreguntaEditorComponent implements OnInit {
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly nombreGrafo = signal('');
  protected readonly estadoGrafo = signal<EstadoGrafo>('Borrador');
  protected readonly esNuevo = signal(true);
  protected readonly subiendoImagen = signal(false);
  protected readonly mostrarConfirmarPublicar = signal(false);
  protected readonly validandoPublicar = signal(false);
  protected readonly validacionParaPublicar = signal<ValidacionDTO | null>(null);
  protected readonly conteoPreguntas = signal(0);
  protected readonly conteoReglas = signal(0);
  /** true si el nodo cargado es el inicio del recorrido, no una pregunta común. */
  protected readonly esInicio = signal(false);

  protected texto = '';
  protected severidad: Severidad = 'moderado';
  protected imagenUrl: string | null = null;
  protected opciones: OpcionForm[] = [{ etiqueta: '', destinoId: '' }];

  protected nodosDisponibles: NodoResumen[] = [];
  protected preguntaAnterior: { texto: string; etiqueta: string } | null = null;

  protected grafoId!: number;
  private nodoId: string | null = null;
  private documento: DocumentoAutoria | null = null;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.grafoId = Number(this.ruta.snapshot.paramMap.get('id'));
    const param = this.ruta.snapshot.paramMap.get('nodoId');
    this.nodoId = param && param !== 'nueva' ? param : null;
    this.esNuevo.set(this.nodoId === null);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.autoria.obtener(this.grafoId).subscribe({
      next: doc => {
        this.nombreGrafo.set(doc.nombre);
        this.documento = doc.documento;
        this.nodosDisponibles = Object.entries(doc.documento.graph.nodes).map(([id, nodo]) => ({
          id,
          texto: nodo.label,
          kind: this.kindDe(nodo.metadata.tipo)
        }));

        if (this.nodoId) {
          const nodoId = this.nodoId;
          const nodo = doc.documento.graph.nodes[nodoId];
          if (!nodo) {
            this.errorCarga.set('Esta pregunta ya no existe en el grafo.');
            this.cargando.set(false);
            return;
          }
          if (nodo.metadata.tipo !== 'pregunta' && nodo.metadata.tipo !== 'inicio') {
            this.errorCarga.set(
              `Este nodo es de tipo "${nodo.metadata.tipo}", un desenlace — edítalo desde el editor de ` +
              'desenlaces, no aquí.'
            );
            this.cargando.set(false);
            return;
          }
          this.esInicio.set(nodo.metadata.tipo === 'inicio');
          this.texto = nodo.label;
          this.severidad = this.severidadDesdePeso(nodo.metadata.peso);
          const src = nodo.metadata.src ?? [];
          this.imagenUrl = src.length > 0 ? src[0] : null;
          this.opciones = this.opcionesDesdeDocumento(nodoId, doc.documento);
          this.preguntaAnterior = this.anteriorDesdeDocumento(nodoId, doc.documento);
        }

        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el grafo. Verifica que el backend esté disponible.');
        this.cargando.set(false);
      }
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

  private kindDe(tipo: string): string {
    if (tipo === 'inicio') return 'Inicio';
    if (tipo === 'pregunta') return 'Pregunta';
    return tipo.length > 0 ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : tipo;
  }

  private severidadDesdePeso(peso: number): Severidad {
    const entradas = Object.entries(PESO_POR_SEVERIDAD) as [Severidad, number][];
    return entradas.reduce(
      (mejor, actual) => (Math.abs(actual[1] - peso) < Math.abs(PESO_POR_SEVERIDAD[mejor] - peso) ? actual[0] : mejor),
      entradas[0][0]
    );
  }

  private opcionesDesdeDocumento(nodoId: string, documento: DocumentoAutoria): OpcionForm[] {
    const propias = documento.graph.edges.filter(a => a.source === nodoId);
    if (propias.length === 0) {
      return [{ etiqueta: '', destinoId: '' }];
    }
    return propias.map(a => ({ etiqueta: this.etiquetaLegible(a.relation), destinoId: a.target }));
  }

  private anteriorDesdeDocumento(
    nodoId: string,
    documento: DocumentoAutoria
  ): { texto: string; etiqueta: string } | null {
    const entrante = documento.graph.edges.find(a => a.target === nodoId);
    if (!entrante) {
      return null;
    }
    const origen = documento.graph.nodes[entrante.source];
    if (!origen) {
      return null;
    }
    return { texto: origen.label, etiqueta: this.etiquetaLegible(entrante.relation) };
  }

  private etiquetaLegible(relation: string): string {
    if (relation === 'SI') return 'Sí';
    if (relation === 'NO') return 'No';
    return relation;
  }

  private etiquetaBackend(etiqueta: string): string {
    const normal = etiqueta.trim().toLowerCase();
    if (normal === 'sí' || normal === 'si') return 'SI';
    if (normal === 'no') return 'NO';
    return etiqueta.trim();
  }

  protected seleccionarSeveridad(s: Severidad): void {
    this.severidad = s;
  }

  protected agregarOpcion(): void {
    this.opciones = [...this.opciones, { etiqueta: '', destinoId: '' }];
  }

  protected quitarOpcion(index: number): void {
    this.opciones = this.opciones.filter((_, i) => i !== index);
  }

  protected subirImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subiendoImagen.set(true);
    this.autoria.subirMedia(archivo).subscribe({
      next: res => {
        this.imagenUrl = res.url;
        this.subiendoImagen.set(false);
      },
      error: () => {
        this.error.set('No se pudo subir la imagen.');
        this.subiendoImagen.set(false);
      }
    });
    input.value = '';
  }

  protected quitarImagen(): void {
    this.imagenUrl = null;
  }

  protected destinoTexto(destinoId: string): string {
    return this.nodosDisponibles.find(n => n.id === destinoId)?.texto ?? '';
  }

  protected destinoKind(destinoId: string): string {
    return this.nodosDisponibles.find(n => n.id === destinoId)?.kind ?? '';
  }

  protected get opcionesValidas(): OpcionForm[] {
    return this.opciones.filter(o => o.etiqueta.trim().length > 0 && o.destinoId);
  }

  protected get puedeGuardar(): boolean {
    return this.texto.trim().length > 0 && !this.guardando();
  }

  protected cancelar(): void {
    this.volver();
  }

  private volver(): void {
    this.router.navigate(['/grafos', this.grafoId]);
  }

  protected guardarPregunta(): void {
    if (!this.puedeGuardar) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    if (this.esInicio()) {
      this.guardarInicioViaPuente();
      return;
    }

    const request: PreguntaRequest = {
      texto: this.texto.trim(),
      imagenes: this.imagenUrl ? [this.imagenUrl] : [],
      severidad: PESO_POR_SEVERIDAD[this.severidad],
      opciones: this.opcionesValidas.map(o => ({
        etiqueta: this.etiquetaBackend(o.etiqueta),
        destinoId: o.destinoId
      }))
    };

    const peticion = this.nodoId
      ? this.autoria.editarPregunta(this.grafoId, this.nodoId, request)
      : this.autoria.crearPregunta(this.grafoId, request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set(
          'No se pudo guardar la pregunta. Verifica que todas las opciones tengan un destino válido.'
        );
      }
    });
  }

  /**
   * Guarda el nodo de inicio por el puente de "guardar" documento completo
   * en vez del endpoint tipado de preguntas — ver el porqué en el JSDoc de
   * la clase. Reconstruye a mano lo que el backend haría por un nodo normal
   * (reemplazar el nodo y sus aristas salientes), pero conservando
   * metadata.tipo="inicio" y el resto de metadata que ya tuviera el nodo.
   */
  private guardarInicioViaPuente(): void {
    if (!this.nodoId || !this.documento) {
      this.guardando.set(false);
      return;
    }
    const nodoId = this.nodoId;
    const nodoExistente = this.documento.graph.nodes[nodoId];

    const nodo: NodoJson = {
      label: this.texto.trim(),
      metadata: {
        ...nodoExistente.metadata,
        tipo: 'inicio',
        peso: PESO_POR_SEVERIDAD[this.severidad],
        archivos: !!this.imagenUrl,
        src: this.imagenUrl ? [this.imagenUrl] : []
      }
    };

    const aristasSinLasSuyas = this.documento.graph.edges.filter(a => a.source !== nodoId);
    for (const opcion of this.opcionesValidas) {
      aristasSinLasSuyas.push({
        source: nodoId,
        relation: this.etiquetaBackend(opcion.etiqueta),
        target: opcion.destinoId
      });
    }

    const documento: DocumentoAutoria = {
      ...this.documento,
      graph: {
        ...this.documento.graph,
        nodes: { ...this.documento.graph.nodes, [nodoId]: nodo },
        edges: aristasSinLasSuyas
      }
    };

    this.autoria.guardar(this.grafoId, documento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set(
          'No se pudo guardar la pregunta de inicio. Verifica que todas las opciones tengan un destino válido.'
        );
      }
    });
  }

  protected eliminarPregunta(): void {
    if (!this.nodoId || this.eliminando()) {
      return;
    }
    const confirmado = confirm('¿Eliminar esta pregunta? También se eliminarán las conexiones hacia y desde ella.');
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);
    this.autoria.eliminarPregunta(this.grafoId, this.nodoId).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.volver();
      },
      error: () => {
        this.eliminando.set(false);
        this.error.set('No se pudo eliminar la pregunta.');
      }
    });
  }

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
    this.autoria.publicar(this.grafoId).subscribe({
      next: resultado => {
        this.publicando.set(false);
        this.mostrarConfirmarPublicar.set(false);
        this.estadoGrafo.set(resultado.estado);
      },
      error: () => {
        this.publicando.set(false);
        this.error.set('El grafo no se pudo publicar porque no es válido. Revisa la estructura en el flujo.');
      }
    });
  }
}
