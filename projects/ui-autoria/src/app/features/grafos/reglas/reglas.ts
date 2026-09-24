import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent, type NivelAlerta } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { ModalPublicarComponent } from '../../../core/ui/modal-publicar/modal-publicar';
import { AutoriaService } from '../../../core/http/autoria';
import { CondicionJson, DocumentoAutoria, EstadoGrafo, ReglaRequest, ValidacionDTO } from '../../../models/autoria.model';

/** Nivel de alerta que sí se puede elegir para una regla (NORMAL es el estado
 * implícito cuando ninguna regla se activa: el backend rechaza una regla con
 * nivel NORMAL al publicar — ver BaseReglasParser). */
type NivelDeRegla = Exclude<NivelAlerta, 'NORMAL'>;

type Operador = 'and' | 'or';

interface CondicionForm {
  idNodo: string;
  respuesta: string;
}

interface NodoResumen {
  id: string;
  texto: string;
  kind: string;
  /** Respuestas posibles (etiquetas legibles de sus aristas salientes). Vacío si no es pregunta. */
  respuestas: { valor: string; legible: string }[];
}

interface ReglaResumen {
  id: string;
  nombre: string;
  nivel: NivelAlerta;
  operador: Operador;
  resumenCondiciones: string;
  destinoTexto: string;
  /** false si condiciones trae Y/O anidado en más de un nivel — este formulario solo construye/edita uno. */
  editable: boolean;
  /** true si la regla trae metadata (autor/fecha/descripción) que este formulario no preserva al guardar. */
  tieneMetadataQueSePierde: boolean;
}

/**
 * Pantalla 4: base de reglas del grafo. Lista las reglas existentes y permite
 * construir una nueva (o modificar una compatible) combinando condiciones con
 * Y o con O (un solo operador para toda la lista de condiciones de la regla).
 * El motor evalúa árboles Y/O anidados a cualquier profundidad
 * (BaseReglasParser), pero este formulario solo construye/edita un nivel
 * (todo Y o todo O) — una regla con Y/O mezclados y anidados (poco común,
 * no la genera este formulario) se marca como no editable aquí en vez de
 * arriesgarse a simplificarla mal.
 */
@Component({
  selector: 'app-reglas',
  standalone: true,
  imports: [FormsModule, SidebarAutoriaComponent, ModalPublicarComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './reglas.html',
  styleUrl: './reglas.scss'
})
export class ReglasComponent implements OnInit {
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly eliminando = signal<string | null>(null);
  protected readonly publicando = signal(false);
  protected readonly nombreGrafo = signal('');
  protected readonly estadoGrafo = signal<EstadoGrafo>('Borrador');
  protected readonly reglas = signal<ReglaResumen[]>([]);
  protected readonly mostrarConstructor = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly avisoMetadata = signal(false);
  protected readonly mostrarConfirmarPublicar = signal(false);
  protected readonly validandoPublicar = signal(false);
  protected readonly validacionParaPublicar = signal<ValidacionDTO | null>(null);
  protected readonly conteoPreguntas = signal(0);

  protected nodosDisponibles: NodoResumen[] = [];
  protected preguntasDisponibles: NodoResumen[] = [];

  protected nombreNueva = '';
  protected condiciones: CondicionForm[] = [{ idNodo: '', respuesta: '' }];
  protected operador: Operador = 'and';
  protected nivel: NivelDeRegla = 'CONSULTAR_MEDICO';
  protected nodoDestinoId = '';

  protected grafoId!: number;
  private documento: DocumentoAutoria | null = null;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.grafoId = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.autoria.obtener(this.grafoId).subscribe({
      next: doc => {
        this.nombreGrafo.set(doc.nombre);
        this.documento = doc.documento;
        this.nodosDisponibles = Object.entries(doc.documento.graph.nodes).map(([id, nodo]) =>
          this.aNodoResumen(id, doc.documento)
        );
        this.preguntasDisponibles = this.nodosDisponibles.filter(n => n.kind === 'Pregunta');
        this.reglas.set(
          Object.entries(doc.documento.rules).map(([id, regla]) => this.aReglaResumen(id, regla as any))
        );
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
        }
      },
      error: () => { /* el chip de estado simplemente no se muestra */ }
    });
  }

  private aNodoResumen(id: string, documento: DocumentoAutoria): NodoResumen {
    const nodo = documento.graph.nodes[id];
    const tipo = nodo.metadata.tipo;
    const kind = tipo === 'inicio' ? 'Inicio' : tipo === 'pregunta' ? 'Pregunta' : this.capitalizar(tipo);
    const relaciones = new Set(
      documento.graph.edges.filter(a => a.source === id).map(a => a.relation)
    );
    return {
      id,
      texto: nodo.label,
      kind,
      respuestas: [...relaciones].map(valor => ({ valor, legible: this.etiquetaLegible(valor) }))
    };
  }

  private capitalizar(texto: string): string {
    return texto.length > 0 ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  }

  private etiquetaLegible(relation: string): string {
    if (relation === 'SI') return 'Sí';
    if (relation === 'NO') return 'No';
    return relation;
  }

  protected nivelLegible(nivel: string): string {
    if (nivel === 'URGENCIA') return 'Urgencia';
    if (nivel === 'CONSULTAR_MEDICO') return 'Consultar médico';
    return nivel;
  }

  protected tonoNivel(nivel: NivelAlerta): 'alerta' | 'aviso' | 'marca' {
    if (nivel === 'URGENCIA') return 'alerta';
    if (nivel === 'CONSULTAR_MEDICO') return 'aviso';
    return 'marca';
  }

  private aReglaResumen(id: string, regla: Record<string, unknown>): ReglaResumen {
    const interpretada = this.interpretarCondiciones(regla['condiciones']);
    const destino = this.nodosDisponibles.find(n => n.id === regla['nodoDestino']);
    const conector = interpretada?.operador === 'or' ? ' O ' : ' Y ';
    return {
      id,
      nombre: String(regla['nombre'] ?? ''),
      nivel: (regla['nivel'] as NivelAlerta) ?? 'NORMAL',
      operador: interpretada?.operador ?? 'and',
      resumenCondiciones: interpretada
        ? interpretada.hojas
            .map(c => {
              const pregunta = this.nodosDisponibles.find(n => n.id === c.idNodo);
              return `${pregunta ? pregunta.texto : c.idNodo} = ${this.etiquetaLegible(c.respuesta)}`;
            })
            .join(conector)
        : 'Condiciones compuestas (Y/O anidado)',
      destinoTexto: destino ? destino.texto : String(regla['nodoDestino'] ?? ''),
      editable: interpretada !== null,
      tieneMetadataQueSePierde: regla['metadata'] != null
    };
  }

  /**
   * Interpreta `condiciones` tal como la guarda el documento (misma forma que
   * evalúa BaseReglasParser): un arreglo es un Y implícito; un objeto
   * {and:[...]} o {or:[...]} es ese operador aplicado a sus hojas. Solo
   * reconoce UN nivel — si cualquier elemento es a su vez un grupo (Y/O
   * anidado dentro de otro), devuelve null porque este formulario no
   * construye ni edita esa forma más general.
   */
  private interpretarCondiciones(condiciones: unknown): { operador: Operador; hojas: CondicionForm[] } | null {
    if (Array.isArray(condiciones)) {
      const hojas = this.soloHojas(condiciones);
      return hojas ? { operador: 'and', hojas } : null;
    }
    if (typeof condiciones === 'object' && condiciones !== null) {
      if ('and' in condiciones && Array.isArray((condiciones as any).and)) {
        const hojas = this.soloHojas((condiciones as any).and);
        return hojas ? { operador: 'and', hojas } : null;
      }
      if ('or' in condiciones && Array.isArray((condiciones as any).or)) {
        const hojas = this.soloHojas((condiciones as any).or);
        return hojas ? { operador: 'or', hojas } : null;
      }
    }
    return null;
  }

  /** Convierte un arreglo a hojas {idNodo,respuesta} si TODOS sus elementos ya son hojas; null si alguno es un grupo anidado. */
  private soloHojas(elementos: unknown[]): CondicionForm[] | null {
    const hojas: CondicionForm[] = [];
    for (const c of elementos as CondicionJson[]) {
      if (typeof c === 'object' && c !== null && 'idNodo' in c && 'respuesta' in c) {
        hojas.push({ idNodo: (c as any).idNodo, respuesta: (c as any).respuesta });
      } else {
        return null;
      }
    }
    return hojas;
  }

  protected respuestasDe(idNodo: string): { valor: string; legible: string }[] {
    return this.nodosDisponibles.find(n => n.id === idNodo)?.respuestas ?? [];
  }

  protected agregarCondicion(): void {
    this.condiciones = [...this.condiciones, { idNodo: '', respuesta: '' }];
  }

  protected quitarCondicion(index: number): void {
    this.condiciones = this.condiciones.filter((_, i) => i !== index);
  }

  protected alCambiarPregunta(condicion: CondicionForm): void {
    const respuestas = this.respuestasDe(condicion.idNodo);
    if (!respuestas.some(r => r.valor === condicion.respuesta)) {
      condicion.respuesta = '';
    }
  }

  protected get condicionesValidas(): CondicionForm[] {
    return this.condiciones.filter(c => c.idNodo && c.respuesta);
  }

  protected get puedeGuardar(): boolean {
    return (
      this.nombreNueva.trim().length > 0 &&
      this.condicionesValidas.length > 0 &&
      this.nodoDestinoId.length > 0 &&
      !this.guardando()
    );
  }

  protected abrirConstructorNuevo(): void {
    this.editandoId.set(null);
    this.nombreNueva = '';
    this.condiciones = [{ idNodo: '', respuesta: '' }];
    this.operador = 'and';
    this.nivel = 'CONSULTAR_MEDICO';
    this.nodoDestinoId = '';
    this.avisoMetadata.set(false);
    this.mostrarConstructor.set(true);
  }

  protected modificar(regla: ReglaResumen): void {
    if (!this.documento || !regla.editable) {
      return;
    }
    const original = this.documento.rules[regla.id] as any;
    const interpretada = this.interpretarCondiciones(original.condiciones);
    this.editandoId.set(regla.id);
    this.nombreNueva = regla.nombre;
    this.condiciones = interpretada ? interpretada.hojas.map(c => ({ ...c })) : [{ idNodo: '', respuesta: '' }];
    this.operador = interpretada?.operador ?? 'and';
    this.nivel = regla.nivel === 'NORMAL' ? 'CONSULTAR_MEDICO' : regla.nivel;
    this.nodoDestinoId = original.nodoDestino ?? '';
    this.avisoMetadata.set(regla.tieneMetadataQueSePierde);
    this.mostrarConstructor.set(true);
  }

  protected cancelarConstructor(): void {
    this.mostrarConstructor.set(false);
    this.editandoId.set(null);
  }

  protected seleccionarOperador(op: Operador): void {
    this.operador = op;
  }

  protected guardarRegla(): void {
    if (!this.puedeGuardar) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    // condicion.respuesta ya guarda el valor crudo del backend (viene del
    // `value` de la opción seleccionada, no del texto legible mostrado).
    const hojas: CondicionJson[] = this.condicionesValidas.map(c => ({ idNodo: c.idNodo, respuesta: c.respuesta }));
    // Un arreglo plano = Y implícito (igual que antes); { or: [...] } cuando
    // el médico eligió "Debe cumplirse ALGUNA" — misma forma que evalúa
    // BaseReglasParser.buildExpresion.
    const condiciones: CondicionJson | CondicionJson[] = this.operador === 'or' ? { or: hojas } : hojas;

    const request: ReglaRequest = {
      nombre: this.nombreNueva.trim(),
      condiciones,
      nivel: this.nivel,
      nodoDestinoId: this.nodoDestinoId
    };

    const id = this.editandoId();
    const peticion = id ? this.autoria.editarRegla(this.grafoId, id, request) : this.autoria.crearRegla(this.grafoId, request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarConstructor.set(false);
        this.editandoId.set(null);
        this.cargar();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar la regla. Verifica que todos los campos sean válidos.');
      }
    });
  }

  protected eliminarRegla(regla: ReglaResumen): void {
    if (this.eliminando()) {
      return;
    }
    const confirmado = confirm(`¿Eliminar la regla "${regla.nombre}"?`);
    if (!confirmado) {
      return;
    }
    this.eliminando.set(regla.id);
    this.autoria.eliminarRegla(this.grafoId, regla.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.cargar();
      },
      error: () => {
        this.eliminando.set(null);
        this.error.set('No se pudo eliminar la regla.');
      }
    });
  }

  protected volverAlFlujo(): void {
    this.router.navigate(['/grafos', this.grafoId]);
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
