import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { NivelAlerta } from 'ui-compartida';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { DialogoConfirmarComponent } from '../../../core/ui/dialogo-confirmar/dialogo-confirmar';
import { AutoriaService, mensajeDeError } from '../../../core/http/autoria';
import { ETIQUETA_ESTADO, EstadoBorrador } from '../../../models/lienzo.model';
import {
  BaseReglaDTO,
  CatalogoDTO,
  Condicion,
  ETIQUETA_NIVEL,
  NodoCatalogoDTO,
  ReglaDTO,
  ReglaRequest,
  opcionesDeNodo,
  terminalesDe,
  textoDeNodo
} from '../../../models/regla.model';
import { VisorReglaComponent } from './visor-regla/visor-regla';

/** Estado del formulario de una regla. */
interface FormRegla {
  nombre: string;
  descripcion: string;
  nivel: NivelAlerta;
  nodoDestino: string;
  casos: Condicion[][];
}

/**
 * Editor de una base de reglas: a la izquierda las reglas de la base, a la
 * derecha el formulario de la regla seleccionada (o de una nueva) y el visor
 * de cómo se activa. Cada operación va al backend y devuelve la base completa.
 */
@Component({
  selector: 'app-editor-reglas',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    SidebarAutoriaComponent,
    DialogoConfirmarComponent,
    VisorReglaComponent,
    BotonComponent,
    EtiquetaComponent,
    MensajeErrorComponent
  ],
  templateUrl: './editor-reglas.html',
  styleUrl: './editor-reglas.scss'
})
export class EditorReglasComponent implements OnInit {
  /** Texto legible de cada nivel de alerta. */
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  /** Texto legible de cada estado del borrador. */
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;

  /** Base de reglas actual. */
  protected readonly base = signal<BaseReglaDTO | null>(null);
  /** Catálogo de nodos del grafo de la base. */
  protected readonly catalogo = signal<CatalogoDTO | null>(null);
  /** True mientras se carga la base. */
  protected readonly cargando = signal(true);
  /** Error de carga de la base. */
  protected readonly error = signal<string | null>(null);

  /** Id de la regla en edición, o null si es una regla nueva. */
  protected readonly reglaId = signal<string | null>(null);
  /** Formulario de la regla. */
  protected readonly form = signal<FormRegla>(EditorReglasComponent.formVacio());
  /** True mientras se guarda la regla. */
  protected readonly guardando = signal(false);
  /** Error del formulario. */
  protected readonly errorForm = signal<string | null>(null);

  /** Confirmación de eliminar regla. */
  protected readonly reglaPorEliminar = signal<ReglaDTO | null>(null);
  protected readonly eliminandoRegla = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  /** True mientras se publica la base. */
  protected readonly publicando = signal(false);
  /** Error de la última publicación. */
  protected readonly errorPublicar = signal<string | null>(null);

  /** Mensaje de confirmación breve. */
  protected readonly mensaje = signal<string | null>(null);

  private id = 0;

  constructor(
    private autoria: AutoriaService,
    private ruta: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.cargar();
  }

  /** Carga la base y su catálogo de nodos. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.obtenerBase(this.id).subscribe({
      next: base => {
        this.base.set(base);
        this.cargando.set(false);
        this.seleccionarInicial(base);
        this.cargarCatalogo(base.grafoId);
      },
      error: e => {
        this.error.set(mensajeDeError(e, 'No se pudo abrir la base. Verifica que el backend esté disponible.'));
        this.cargando.set(false);
      }
    });
  }

  /** Carga el catálogo de nodos del grafo de la base. */
  private cargarCatalogo(grafoId: string): void {
    this.autoria.catalogo(grafoId).subscribe({
      next: catalogo => this.catalogo.set(catalogo),
      error: () => this.catalogo.set(null)
    });
  }

  /** Selecciona la primera regla si existe; si no, abre una nueva. */
  private seleccionarInicial(base: BaseReglaDTO): void {
    if (base.reglas.length > 0) {
      this.editarRegla(base.reglas[0]);
    } else {
      this.nuevaRegla();
    }
  }

  /** Preguntas del catálogo (nodos con respuestas). */
  protected get preguntas(): NodoCatalogoDTO[] {
    return (this.catalogo()?.nodos ?? []).filter(n => n.tipo === 'pregunta');
  }

  /** Conclusiones del catálogo (posibles destinos). */
  protected get terminales(): NodoCatalogoDTO[] {
    return terminalesDe(this.catalogo());
  }

  /** Opciones de respuesta de un nodo pregunta. */
  protected opciones(idNodo: string): string[] {
    return opcionesDeNodo(this.catalogo(), idNodo);
  }

  /** Texto legible de un nodo del catálogo. */
  protected textoNodo(id: string | null): string {
    return textoDeNodo(this.catalogo(), id);
  }

  // --- Lista de reglas --------------------------------------------------------

  /** Abre una regla existente en el formulario. */
  protected editarRegla(regla: ReglaDTO): void {
    this.reglaId.set(regla.id);
    this.errorForm.set(null);
    this.form.set({
      nombre: regla.nombre,
      descripcion: regla.descripcion ?? '',
      nivel: regla.nivel === 'NORMAL' ? 'CONSULTAR_MEDICO' : regla.nivel,
      nodoDestino: regla.nodoDestino,
      casos: regla.casos.map(caso => caso.map(c => ({ ...c })))
    });
  }

  /** Abre el formulario vacío para una regla nueva. */
  protected nuevaRegla(): void {
    this.reglaId.set(null);
    this.errorForm.set(null);
    this.form.set(EditorReglasComponent.formVacio());
  }

  // --- Edición de casos y condiciones ----------------------------------------

  /** Fija el nombre de la regla. */
  protected setNombre(valor: string): void {
    this.form.update(f => ({ ...f, nombre: valor }));
  }

  /** Fija la descripción de la regla. */
  protected setDescripcion(valor: string): void {
    this.form.update(f => ({ ...f, descripcion: valor }));
  }

  /** Fija el nivel de alerta de la regla. */
  protected setNivel(nivel: NivelAlerta): void {
    this.form.update(f => ({ ...f, nivel }));
  }

  /** Fija el nodo destino de la regla. */
  protected setNodoDestino(valor: string): void {
    this.form.update(f => ({ ...f, nodoDestino: valor }));
  }

  /** Cambia la pregunta de una condición y limpia su respuesta. */
  protected cambiarPregunta(cond: Condicion, idNodo: string): void {
    cond.idNodo = idNodo;
    cond.respuesta = '';
  }

  /** Fija la respuesta de una condición. */
  protected cambiarRespuesta(cond: Condicion, respuesta: string): void {
    cond.respuesta = respuesta;
  }

  /** Agrega una condición vacía al caso. */
  protected agregarCondicion(caso: Condicion[]): void {
    caso.push({ idNodo: '', respuesta: '' });
  }

  /** Quita una condición del caso. */
  protected quitarCondicion(caso: Condicion[], indice: number): void {
    caso.splice(indice, 1);
  }

  /** Agrega un caso nuevo con una condición vacía. */
  protected agregarCaso(): void {
    this.form.update(f => ({ ...f, casos: [...f.casos, [{ idNodo: '', respuesta: '' }]] }));
  }

  /** Quita un caso. */
  protected quitarCaso(indice: number): void {
    this.form.update(f => ({ ...f, casos: f.casos.filter((_, i) => i !== indice) }));
  }

  /** True si el formulario se puede guardar. */
  protected get puedeGuardar(): boolean {
    const f = this.form();
    if (!f.nombre.trim() || !f.nodoDestino || f.casos.length === 0) {
      return false;
    }
    return f.casos.every(caso =>
      caso.length > 0 && caso.every(c => c.idNodo !== '' && c.respuesta !== ''));
  }

  /** Guarda (crea o edita) la regla. */
  protected guardar(): void {
    if (!this.puedeGuardar || this.guardando()) {
      return;
    }
    const request = EditorReglasComponent.aRequest(this.form());
    this.guardando.set(true);
    this.errorForm.set(null);
    const idRegla = this.reglaId();
    const operacion = idRegla
      ? this.autoria.editarRegla(this.id, idRegla, request)
      : this.autoria.agregarRegla(this.id, request);
    operacion.subscribe({
      next: base => {
        this.base.set(base);
        this.guardando.set(false);
        const guardada = idRegla ? base.reglas.find(r => r.id === idRegla) : base.reglas[base.reglas.length - 1];
        if (guardada) {
          this.editarRegla(guardada);
        }
        this.avisar(idRegla ? 'Regla guardada.' : 'Regla creada.');
      },
      error: e => {
        this.guardando.set(false);
        this.errorForm.set(mensajeDeError(e, 'No se pudo guardar la regla. Intenta de nuevo.'));
      }
    });
  }

  /** Cancela la edición y vuelve a la regla seleccionada o a una nueva. */
  protected cancelar(): void {
    const base = this.base();
    if (this.reglaId() && base) {
      const actual = base.reglas.find(r => r.id === this.reglaId());
      if (actual) {
        this.editarRegla(actual);
        return;
      }
    }
    this.nuevaRegla();
  }

  // --- Eliminar regla ---------------------------------------------------------

  /** Abre la confirmación de eliminar la regla en edición. */
  protected pedirEliminar(): void {
    const idRegla = this.reglaId();
    const regla = this.base()?.reglas.find(r => r.id === idRegla);
    if (regla) {
      this.errorEliminar.set(null);
      this.reglaPorEliminar.set(regla);
    }
  }

  /** Cancela el diálogo de eliminar regla. */
  protected cancelarEliminar(): void {
    this.reglaPorEliminar.set(null);
    this.errorEliminar.set(null);
  }

  /** Elimina la regla confirmada. */
  protected confirmarEliminar(): void {
    const regla = this.reglaPorEliminar();
    if (!regla || this.eliminandoRegla()) {
      return;
    }
    this.eliminandoRegla.set(true);
    this.errorEliminar.set(null);
    this.autoria.eliminarRegla(this.id, regla.id).subscribe({
      next: base => {
        this.base.set(base);
        this.eliminandoRegla.set(false);
        this.reglaPorEliminar.set(null);
        this.seleccionarInicial(base);
        this.avisar('Se eliminó la regla.');
      },
      error: e => {
        this.eliminandoRegla.set(false);
        this.errorEliminar.set(mensajeDeError(e, 'No se pudo eliminar la regla. Intenta de nuevo.'));
      }
    });
  }

  // --- Publicar base ----------------------------------------------------------

  /** Publica la base; si hay avisos bloqueantes, los muestra. */
  protected publicar(): void {
    if (this.publicando()) {
      return;
    }
    this.publicando.set(true);
    this.errorPublicar.set(null);
    this.autoria.publicarBase(this.id).subscribe({
      next: base => {
        this.base.set(base);
        this.publicando.set(false);
        this.avisar('Publicada: las reglas ya están activas.');
      },
      error: e => {
        this.publicando.set(false);
        this.errorPublicar.set(mensajeDeError(e, 'No se pudo publicar. Intenta de nuevo.'));
      }
    });
  }

  // --- Vista ------------------------------------------------------------------

  /** Tono de la etiqueta según el estado del borrador. */
  protected tonoEstado(estado: EstadoBorrador): 'calma' | 'aviso' | 'marca' {
    return estado === 'PUBLICADO' ? 'calma' : estado === 'CAMBIOS_SIN_PUBLICAR' ? 'aviso' : 'marca';
  }

  /** Muestra un mensaje de confirmación que desaparece solo. */
  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => {
      if (this.mensaje() === texto) this.mensaje.set(null);
    }, 4000);
  }

  /** Formulario vacío con un caso y una condición. */
  private static formVacio(): FormRegla {
    return {
      nombre: '',
      descripcion: '',
      nivel: 'CONSULTAR_MEDICO',
      nodoDestino: '',
      casos: [[{ idNodo: '', respuesta: '' }]]
    };
  }

  /** Convierte el formulario en la petición del backend, sin condiciones vacías. */
  private static aRequest(form: FormRegla): ReglaRequest {
    const casos = form.casos
      .map(caso => caso.filter(c => c.idNodo !== '' && c.respuesta !== ''))
      .filter(caso => caso.length > 0);
    return {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      casos,
      nivel: form.nivel,
      nodoDestino: form.nodoDestino
    };
  }
}
