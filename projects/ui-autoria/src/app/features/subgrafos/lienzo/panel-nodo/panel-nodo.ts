import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent } from 'ui-compartida';
import {
  Desenlace,
  ETIQUETA_DESENLACE,
  ETIQUETA_GRAVEDAD,
  Gravedad,
  NodoLienzo,
  NodoRequest,
  RespuestaLienzo
} from '../../../../models/lienzo.model';

/**
 * Para qué se abrió el panel:
 * - `primera`: el lienzo está vacío y se crea la primera pregunta;
 * - `mas`: se tocó el "+" de una respuesta;
 * - `editar`: se tocó un nodo;
 * - `enlace`: se tocó el chip de una respuesta que va a una pregunta existente.
 */
export type ContextoPanel =
  | { tipo: 'primera' }
  | { tipo: 'mas'; origen: NodoLienzo; respuesta: RespuestaLienzo }
  | { tipo: 'editar'; nodo: NodoLienzo }
  | { tipo: 'enlace'; origen: NodoLienzo; respuesta: RespuestaLienzo; destino: NodoLienzo };

/** Qué se elige en el control segmentado. */
export type ModoPanel = 'PREGUNTA' | 'CONCLUSION' | 'EXISTENTE';

/** Respuesta en el formulario; `id` solo si ya existía (conserva su destino). */
interface FilaRespuesta {
  id: string | null;
  texto: string;
  gravedad: Gravedad;
  /** true si ya lleva a otro nodo: quitarla deja suelto lo que colgaba de ella. */
  tieneCamino: boolean;
}

/**
 * Panel lateral del lienzo: arma el nodo que va después de un "+", edita uno
 * existente o cambia a qué pregunta va una respuesta. No llama al backend:
 * emite la petición y el lienzo la envía y redibuja con lo que vuelve.
 */
@Component({
  selector: 'app-panel-nodo',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './panel-nodo.html',
  styleUrl: './panel-nodo.scss'
})
export class PanelNodoComponent implements OnChanges {
  @Input({ required: true }) contexto!: ContextoPanel;
  /** Preguntas del lienzo, para "Pregunta existente". */
  @Input() preguntas: NodoLienzo[] = [];
  @Input() ocupado = false;
  @Input() error: string | null = null;

  /** La acción del "+" o la primera pregunta. */
  @Output() crear = new EventEmitter<NodoRequest>();
  @Output() guardar = new EventEmitter<{ nodoId: string; request: NodoRequest }>();
  @Output() eliminar = new EventEmitter<string>();
  /** "Pregunta existente"; `nodoId` nulo quita el enlace (la respuesta vuelve a ser un "+"). */
  @Output() enlazar = new EventEmitter<{ respuestaId: string; nodoId: string | null }>();
  @Output() cerrar = new EventEmitter<void>();

  protected readonly gravedades: Gravedad[] = ['LEVE', 'MODERADA', 'GRAVE'];
  protected readonly etiquetaGravedad = ETIQUETA_GRAVEDAD;
  protected readonly desenlaces: Desenlace[] = ['RECOMENDACION', 'CONSULTA_MEDICA', 'URGENCIA'];
  protected readonly etiquetaDesenlace = ETIQUETA_DESENLACE;

  protected modo: ModoPanel = 'PREGUNTA';
  protected texto = '';
  protected variasRespuestas = false;
  protected desenlace: Desenlace | null = null;
  protected respuestas: FilaRespuesta[] = [];
  protected destinoExistente: string | null = null;

  ngOnChanges(): void {
    this.reiniciar();
  }

  private reiniciar(): void {
    const c = this.contexto;
    this.destinoExistente = null;
    if (c.tipo === 'editar') {
      this.modo = c.nodo.tipo;
      this.texto = c.nodo.texto;
      this.variasRespuestas = c.nodo.variasRespuestas;
      this.desenlace = c.nodo.desenlace;
      this.respuestas = c.nodo.respuestas.map(r => ({
        id: r.id, texto: r.texto, gravedad: r.gravedad, tieneCamino: r.destino !== null
      }));
      return;
    }
    this.modo = c.tipo === 'enlace' ? 'EXISTENTE' : 'PREGUNTA';
    this.texto = '';
    this.variasRespuestas = false;
    this.desenlace = null;
    this.respuestas = [this.filaNueva(), this.filaNueva()];
    if (c.tipo === 'enlace') {
      this.destinoExistente = c.destino.id;
    }
  }

  private filaNueva(): FilaRespuesta {
    return { id: null, texto: '', gravedad: 'LEVE', tieneCamino: false };
  }

  // --- Lo que muestra el panel -------------------------------------------------

  protected get titulo(): string {
    switch (this.contexto.tipo) {
      case 'primera': return 'Primera pregunta';
      case 'mas': return '¿Qué pasa después?';
      case 'enlace': return 'Va a una pregunta existente';
      case 'editar': return this.contexto.nodo.tipo === 'PREGUNTA' ? 'Editar pregunta' : 'Editar conclusión';
    }
  }

  /** «Después de: ¿…? → respuesta», o null si no aplica. */
  protected get despuesDe(): { pregunta: string; respuesta: string; gravedad: Gravedad } | null {
    const c = this.contexto;
    if (c.tipo === 'mas' || c.tipo === 'enlace') {
      return { pregunta: c.origen.texto, respuesta: c.respuesta.texto, gravedad: c.respuesta.gravedad };
    }
    return null;
  }

  /** El control segmentado solo aparece al crear después de un "+" o sobre un enlace. */
  protected get modos(): ModoPanel[] {
    switch (this.contexto.tipo) {
      case 'mas':
      case 'enlace': return ['PREGUNTA', 'CONCLUSION', 'EXISTENTE'];
      default: return [];
    }
  }

  protected etiquetaModo(modo: ModoPanel): string {
    return modo === 'PREGUNTA' ? 'Pregunta' : modo === 'CONCLUSION' ? 'Conclusión' : 'Pregunta existente';
  }

  /** Preguntas a las que puede ir la respuesta: todas menos la suya. */
  protected get preguntasDestino(): NodoLienzo[] {
    const c = this.contexto;
    const origen = c.tipo === 'mas' || c.tipo === 'enlace' ? c.origen.id : null;
    return this.preguntas.filter(p => p.id !== origen);
  }

  protected get esEdicion(): boolean {
    return this.contexto.tipo === 'editar';
  }

  /** En un enlace, crear un nodo nuevo exige quitar antes el enlace. */
  protected get bloqueadoPorEnlace(): boolean {
    return this.contexto.tipo === 'enlace' && this.modo !== 'EXISTENTE';
  }

  protected get puedeEnviar(): boolean {
    if (this.ocupado || this.bloqueadoPorEnlace) return false;
    switch (this.modo) {
      case 'EXISTENTE': return this.destinoExistente !== null;
      case 'CONCLUSION': return this.texto.trim().length > 0 && this.desenlace !== null;
      case 'PREGUNTA': return this.texto.trim().length > 0;
    }
  }

  protected get textoBoton(): string {
    if (this.ocupado) return 'Guardando…';
    if (this.esEdicion) return 'Guardar';
    return this.modo === 'EXISTENTE' ? 'Ir a esa pregunta' : 'Agregar al lienzo';
  }

  // --- Respuestas ---------------------------------------------------------------

  protected agregarRespuesta(): void {
    this.respuestas = [...this.respuestas, this.filaNueva()];
  }

  protected quitarRespuesta(indice: number): void {
    this.respuestas = this.respuestas.filter((_, i) => i !== indice);
  }

  protected elegirGravedad(fila: FilaRespuesta, gravedad: Gravedad): void {
    fila.gravedad = gravedad;
  }

  // --- Acciones -----------------------------------------------------------------

  protected enviar(): void {
    if (!this.puedeEnviar) return;
    const c = this.contexto;

    if (this.modo === 'EXISTENTE') {
      if (c.tipo === 'mas' || c.tipo === 'enlace') {
        this.enlazar.emit({ respuestaId: c.respuesta.id, nodoId: this.destinoExistente });
      }
      return;
    }

    const request = this.request();
    if (c.tipo === 'editar') {
      this.guardar.emit({ nodoId: c.nodo.id, request });
    } else {
      request.tipo = this.modo;
      request.despuesDe = c.tipo === 'mas' ? { nodoId: c.origen.id, respuestaId: c.respuesta.id } : null;
      this.crear.emit(request);
    }
  }

  protected quitarEnlace(): void {
    const c = this.contexto;
    if (c.tipo === 'enlace') {
      this.enlazar.emit({ respuestaId: c.respuesta.id, nodoId: null });
    }
  }

  protected eliminarNodo(): void {
    if (this.contexto.tipo === 'editar') {
      this.eliminar.emit(this.contexto.nodo.id);
    }
  }

  private request(): NodoRequest {
    if (this.modo === 'CONCLUSION') {
      return { texto: this.texto.trim(), desenlace: this.desenlace };
    }
    return {
      texto: this.texto.trim(),
      variasRespuestas: this.variasRespuestas,
      // Las filas vacías se ignoran: el médico puede dejar un renglón de sobra.
      respuestas: this.respuestas
        .filter(r => r.texto.trim().length > 0 || r.id !== null)
        .map(r => ({ id: r.id, texto: r.texto.trim(), gravedad: r.gravedad }))
    };
  }
}
