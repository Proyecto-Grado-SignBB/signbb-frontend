import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { AutoriaService } from '../../../core/http/autoria';
import { DocumentoAutoria, EstadoGrafo, NodoJson, ValidacionDTO } from '../../../models/autoria.model';

/**
 * OJO: el valor real en el documento JSON es "consulta médica" (con espacio
 * y tilde), no "consulta_medica" — así está en el seed
 * (ejemplo_grafo.json) y así lo espera GrafoClinicoParser.normalizarTipo(),
 * que es quien lo traduce a "consulta_medica" para el TAD interno del
 * motor. Un valor con guion bajo aquí simplemente no calza con ningún nodo
 * real y la pantalla se niega a cargarlo (como pasó antes de este ajuste).
 */
type TipoDesenlace = 'recomendacion' | 'consulta médica' | 'urgencia';

const TIPOS_DESENLACE: TipoDesenlace[] = ['recomendacion', 'consulta médica', 'urgencia'];

/**
 * Pantalla 6: crear/editar un desenlace (nodo terminal: recomendación,
 * consulta médica o urgencia).
 *
 * No existe todavía un endpoint tipado para esto en el backend (ver la nota
 * enviada al equipo de backend, punto 1) — `ServicioAutoriaImpl.construirNodoPregunta`
 * sigue fijando `metadata.tipo="pregunta"` sin excepción. Mientras eso no
 * cambie, esta pantalla usa el mismo puente que ya usa "Guardar" en la
 * Pantalla 2: trae el documento completo, le agrega o edita el nodo terminal
 * a mano, y lo manda de vuelta por `POST /grafos/{id}/guardar` — que sí
 * acepta cualquier valor de texto en metadata.tipo, porque el esquema solo
 * exige que sea texto (ver ValidadorEsquema). Cuando el backend tenga un
 * endpoint dedicado, solo hay que cambiar guardarDesenlace() por la llamada
 * tipada; el resto de la pantalla no cambia.
 */
@Component({
  selector: 'app-desenlace-editor',
  standalone: true,
  imports: [FormsModule, SidebarAutoriaComponent, ModalPublicarComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './desenlace-editor.html',
  styleUrl: './desenlace-editor.scss'
})
export class DesenlaceEditorComponent implements OnInit {
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly nombreGrafo = signal('');
  protected readonly estadoGrafo = signal<EstadoGrafo>('Borrador');
  protected readonly esNuevo = signal(true);
  protected readonly mostrarConfirmarPublicar = signal(false);
  protected readonly validandoPublicar = signal(false);
  protected readonly validacionParaPublicar = signal<ValidacionDTO | null>(null);
  protected readonly conteoPreguntas = signal(0);
  protected readonly conteoReglas = signal(0);

  protected mensaje = '';
  protected tipo: TipoDesenlace = 'recomendacion';
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
    this.nodoId = param && param !== 'nuevo' ? param : null;
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

        if (this.nodoId) {
          const nodoId = this.nodoId;
          const nodo = doc.documento.graph.nodes[nodoId];
          if (!nodo) {
            this.errorCarga.set('Este desenlace ya no existe en el grafo.');
            this.cargando.set(false);
            return;
          }
          if (!TIPOS_DESENLACE.includes(nodo.metadata.tipo as TipoDesenlace)) {
            this.errorCarga.set(
              `Este nodo es de tipo "${nodo.metadata.tipo}", no un desenlace — si es una pregunta, ` +
              'edítala desde el editor de preguntas.'
            );
            this.cargando.set(false);
            return;
          }
          this.mensaje = nodo.label;
          this.tipo = nodo.metadata.tipo as TipoDesenlace;
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
    const etiqueta = entrante.relation === 'SI' ? 'Sí' : entrante.relation === 'NO' ? 'No' : entrante.relation;
    return { texto: origen.label, etiqueta };
  }

  protected seleccionarTipo(t: TipoDesenlace): void {
    this.tipo = t;
  }

  protected etiquetaTipo(t: TipoDesenlace): string {
    if (t === 'recomendacion') return 'Recomendación';
    if (t === 'consulta médica') return 'Consulta médica';
    return 'Urgencia';
  }

  protected get puedeGuardar(): boolean {
    return this.mensaje.trim().length > 0 && !this.guardando();
  }

  protected cancelar(): void {
    this.volver();
  }

  private volver(): void {
    this.router.navigate(['/grafos', this.grafoId]);
  }

  private generarId(): string {
    const sufijo = (crypto as { randomUUID?: () => string }).randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `desenlace_${sufijo}`;
  }

  protected guardarDesenlace(): void {
    if (!this.puedeGuardar || !this.documento) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    const nodoId = this.nodoId ?? this.generarId();
    const nodoExistente = this.documento.graph.nodes[nodoId];
    const nodo: NodoJson = {
      label: this.mensaje.trim(),
      metadata: {
        ...nodoExistente?.metadata,
        tipo: this.tipo,
        peso: nodoExistente?.metadata.peso ?? 0,
        archivos: nodoExistente?.metadata.archivos ?? false
      }
    };

    const documento: DocumentoAutoria = {
      ...this.documento,
      graph: {
        ...this.documento.graph,
        nodes: { ...this.documento.graph.nodes, [nodoId]: nodo }
      }
    };

    this.autoria.guardar(this.grafoId, documento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.volver();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar el desenlace.');
      }
    });
  }

  protected eliminarDesenlace(): void {
    if (!this.nodoId || !this.documento || this.eliminando()) {
      return;
    }
    const confirmado = confirm(
      '¿Eliminar este desenlace? Las preguntas que apuntaban a él quedarán sin ese destino.'
    );
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);

    const nodoId = this.nodoId;
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
        this.volver();
      },
      error: () => {
        this.eliminando.set(false);
        this.error.set('No se pudo eliminar el desenlace.');
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
