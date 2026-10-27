import { Component, OnInit, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse, ResponderRequest } from '../../../models/recorrido.model';
import { BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent } from 'ui-compartida';
import { CarruselImagenesComponent } from '../carrusel-imagenes/carrusel-imagenes';
import {
  AVISO_RECORRIDO_NO_DISPONIBLE, AVISO_RECORRIDO_VENCIDO, recorridoNoDisponible, recorridoVencido
} from '../../../core/sesion/sesion';
import { etiquetaOpcion } from '../../../models/etiquetas-opcion';

const ORDEN_OPCIONES_IMAGEN = ['NO', 'SI'];

/**
 * Tiempo en que «volver» queda bloqueado tras un retroceso exitoso. En local el backend
 * responde en milisegundos, así que sin esta pausa un doble clic retrocedería dos preguntas.
 */
const ENFRIAMIENTO_VOLVER_MS = 400;

/**
 * Pantalla de una pregunta en curso. Carga el estado del recorrido por su
 * `recorridoId` y muestra la pregunta según su tipo (binaria, de imagen o de
 * selección múltiple); al responder avanza o navega al resultado. Permite
 * retroceder a la pregunta anterior.
 *
 * MODIFICADO (ítem 2.7, CU11): «Reiniciar» en el encabezado pide confirmación y
 * empieza la consulta de nuevo; también se ofrece al intentar volver desde la
 * primera pregunta. Un recorrido vencido o ya reiniciado (410) vuelve al inicio
 * con su aviso.
 */
@Component({
  selector: 'app-pregunta',
  standalone: true,
  imports: [BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent, CarruselImagenesComponent],
  templateUrl: './pregunta.html',
  styleUrl: './pregunta.scss'
})
export class PreguntaComponent implements OnInit {
  /** Estado actual del recorrido (pregunta en curso). */
  respuesta = signal<RecorridoResponse | null>(null);
  /** Opción elegida en preguntas de selección única. */
  seleccionActual = signal<string | null>(null);
  /** Opciones marcadas en preguntas de selección múltiple. */
  opcionesSeleccionadas = signal<Set<string>>(new Set());
  /** True mientras se envía una respuesta. */
  enviando = signal(false);
  /** True mientras «volver» está en curso o en su pausa anticlic (ver ENFRIAMIENTO_VOLVER_MS). */
  volviendo = signal(false);
  /** Mensaje de error de la última operación. */
  error = signal<string | null>(null);
  /**
   * Confirmación de reinicio visible: `'boton'` si la pidió el padre con
   * «Reiniciar», `'primera'` si intentó volver desde la primera pregunta.
   */
  confirmarReinicio = signal<'boton' | 'primera' | null>(null);
  /** True mientras se reinicia la consulta. */
  reiniciando = signal(false);

  /** Índice de la imagen visible en el carrusel. */
  indiceImagen = signal(0);
  /** Número de imágenes del carrusel. */
  totalImagenes = 3;
  private inicioArrastreX = 0;

  /**
   * Pregunta con imágenes de una sola respuesta: vista de comparación visual,
   * donde tocar una opción responde. Si es de selección múltiple se usa la
   * vista de selección, con las imágenes arriba.
   */
  esImagen = computed(() =>
    (this.respuesta()?.pregunta?.tieneImagenes ?? false) && !this.esSeleccionMultiple());

  /** True si la pregunta admite selección múltiple. */
  esSeleccionMultiple = computed(() =>
    this.respuesta()?.pregunta?.tipoInteraccion === 'SELECCION_MULTIPLE');

  /** True si la pregunta es binaria (dos opciones o menos, sin imágenes). */
  esBinaria = computed(() =>
    !this.esImagen() && !this.esSeleccionMultiple()
    && (this.respuesta()?.pregunta?.opciones.length ?? 0) <= 2);

  /** Opciones de una pregunta de imagen, en el orden NO/SI de los botones. */
  opcionesImagen = computed(() => {
    const opciones = this.respuesta()?.pregunta?.opciones ?? [];
    return [...opciones].sort(
      (a, b) => ORDEN_OPCIONES_IMAGEN.indexOf(a) - ORDEN_OPCIONES_IMAGEN.indexOf(b)
    );
  });

  private recorridoId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recorridoService: RecorridoService
  ) { }

  ngOnInit(): void {
    this.recorridoId = this.route.snapshot.paramMap.get('recorridoId')!;
    this.cargar();
  }

  /** Carga (o recarga) el estado del recorrido. */
  cargar(): void {
    this.error.set(null);
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => {
        this.respuesta.set(r);
        this.opcionesSeleccionadas.set(new Set());
      },
      error: e => {
        if (this.salirSiNoSigue(e)) {
          return;
        }
        this.error.set('No pudimos cargar la pregunta. Intenta de nuevo.');
      }
    });
  }

  /**
   * Botón «volver» del encabezado: deshace la última respuesta en el backend y
   * muestra de nuevo la pregunta anterior para poder cambiarla. Si no hay pasos
   * en el historial (primera pregunta o sesión heredada) el backend responde 400
   * y se ofrece reiniciar la consulta o ir al inicio.
   */
  volver(): void {
    if (this.enviando() || this.volviendo()) {
      return;
    }
    this.error.set(null);
    this.volviendo.set(true);
    this.recorridoService.retroceder(this.recorridoId).subscribe({
      next: r => {
        this.seleccionActual.set(null);
        this.opcionesSeleccionadas.set(new Set());
        this.respuesta.set(r);
        setTimeout(() => this.volviendo.set(false), ENFRIAMIENTO_VOLVER_MS);
      },
      error: (e: HttpErrorResponse) => {
        this.volviendo.set(false);
        if (e.status === 400) {
          this.confirmarReinicio.set('primera');
        } else if (!this.salirSiNoSigue(e)) {
          this.error.set('No pudimos volver a la pregunta anterior. Intenta de nuevo.');
        }
      }
    });
  }

  /** Texto legible de una opción; si no hay traducción, usa el valor crudo. */
  etiqueta(valor: string): string {
    return etiquetaOpcion(valor);
  }

  /** Muestra la confirmación de «Reiniciar consulta». */
  pedirReinicio(): void {
    this.confirmarReinicio.set('boton');
  }

  /** Cierra la confirmación sin reiniciar. */
  cancelarReinicio(): void {
    this.confirmarReinicio.set(null);
  }

  /** Sale al inicio sin reiniciar (desde la confirmación de la primera pregunta). */
  irAlInicio(): void {
    this.router.navigate(['/']);
  }

  /**
   * Reinicia la consulta: el back marca este recorrido como reiniciado y empieza
   * uno nuevo, al que se navega. Si el recorrido ya terminó (409), se muestra
   * su resultado.
   */
  reiniciar(): void {
    if (this.reiniciando()) {
      return;
    }
    this.error.set(null);
    this.reiniciando.set(true);
    this.recorridoService.reiniciar(this.recorridoId).subscribe({
      next: r => {
        this.reiniciando.set(false);
        this.confirmarReinicio.set(null);
        this.recorridoId = r.recorridoId;
        this.seleccionActual.set(null);
        this.opcionesSeleccionadas.set(new Set());
        this.respuesta.set(r);
        this.router.navigate(['/pregunta', r.recorridoId], { replaceUrl: true });
      },
      error: e => {
        this.reiniciando.set(false);
        this.confirmarReinicio.set(null);
        if (this.salirSiNoSigue(e)) {
          return;
        }
        if (e instanceof HttpErrorResponse && e.status === 409) {
          this.router.navigate(['/resultado', this.recorridoId]);
          return;
        }
        const mensaje = e instanceof HttpErrorResponse ? (e.error as { mensaje?: unknown } | null)?.mensaje : null;
        if (e instanceof HttpErrorResponse && e.status === 503 && typeof mensaje === 'string' && mensaje) {
          this.error.set(mensaje);
          return;
        }
        this.error.set('No pudimos reiniciar la consulta. Intenta de nuevo.');
      }
    });
  }

  /** Selecciona una opción: envía de inmediato si es binaria o de imagen, o espera confirmación. */
  seleccionar(valor: string): void {
    if (this.esBinaria() || this.esImagen()) {
      this.enviar(valor);
    } else {
      this.seleccionActual.set(valor);
    }
  }

  /** Confirma la opción elegida en una pregunta de selección única. */
  continuar(): void {
    const valor = this.seleccionActual();
    if (valor) {
      this.enviar(valor);
    }
  }

  /** True si la opción está marcada en una pregunta de selección múltiple. */
  estaSeleccionada(opcion: string): boolean {
    return this.opcionesSeleccionadas().has(opcion);
  }

  /** Marca o desmarca una opción en una pregunta de selección múltiple. */
  alternarOpcion(opcion: string): void {
    const actuales = new Set(this.opcionesSeleccionadas());
    if (actuales.has(opcion)) {
      actuales.delete(opcion);
    } else {
      actuales.add(opcion);
    }
    this.opcionesSeleccionadas.set(actuales);
  }

  /** Envía todas las opciones marcadas; no hace nada si no hay ninguna. */
  continuarMultiple(): void {
    const opciones = Array.from(this.opcionesSeleccionadas());
    if (opciones.length === 0) {
      return;
    }
    this.enviarSolicitud({ opciones, tipo: 'SELECCION_MULTIPLE' });
  }

  /** Va a una imagen del carrusel, acotando el índice al rango válido. */
  irAImagen(i: number): void {
    this.indiceImagen.set(Math.max(0, Math.min(this.totalImagenes - 1, i)));
  }

  /** Guarda el punto donde empezó el gesto de arrastre. */
  onArrastreInicio(x: number): void {
    this.inicioArrastreX = x;
  }

  /** Cambia de imagen si el arrastre horizontal supera el umbral. */
  onArrastreFin(x: number): void {
    const delta = x - this.inicioArrastreX;
    if (delta < -35) this.irAImagen(this.indiceImagen() + 1);
    else if (delta > 35) this.irAImagen(this.indiceImagen() - 1);
  }

  /** Envía una respuesta de una sola opción. */
  private enviar(valor: string): void {
    this.enviarSolicitud({ respuesta: valor });
  }

  /** Envía la respuesta al backend y navega al resultado si el recorrido terminó. */
  private enviarSolicitud(request: ResponderRequest): void {
    this.error.set(null);
    this.enviando.set(true);
    const idPregunta = this.respuesta()?.pregunta?.id;
    this.recorridoService.responder(this.recorridoId, { ...request, idPregunta }).subscribe({
      next: r => {
        this.enviando.set(false);
        this.seleccionActual.set(null);
        this.opcionesSeleccionadas.set(new Set());
        if (r.estado === 'FINALIZADO') {
          this.router.navigate(['/resultado', this.recorridoId]);
        } else {
          this.respuesta.set(r);
        }
      },
      error: e => {
        this.enviando.set(false);
        if (this.salirSiNoSigue(e)) {
          return;
        }
        if (e instanceof HttpErrorResponse && e.status === 409) {
          // La pregunta ya se respondió (clic repetido) o se está guardando: se muestra cómo va el recorrido.
          this.mostrarEstadoActual();
          return;
        }
        this.error.set('No pudimos registrar tu respuesta. Intenta de nuevo.');
      }
    });
  }

  /** Consulta el recorrido y muestra la pregunta actual, o el resultado si ya terminó. */
  private mostrarEstadoActual(): void {
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => {
        this.seleccionActual.set(null);
        this.opcionesSeleccionadas.set(new Set());
        if (r.estado === 'FINALIZADO') {
          this.router.navigate(['/resultado', this.recorridoId]);
        } else {
          this.respuesta.set(r);
        }
      },
      error: () => this.error.set('No pudimos cargar la pregunta. Intenta de nuevo.')
    });
  }

  /**
   * Si el recorrido ya no está disponible (404) o venció o se reinició (410),
   * vuelve al inicio con el aviso que corresponde.
   *
   * @returns true si salió de la pantalla
   */
  private salirSiNoSigue(e: unknown): boolean {
    if (recorridoNoDisponible(e)) {
      this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_NO_DISPONIBLE });
      return true;
    }
    if (recorridoVencido(e)) {
      this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_VENCIDO });
      return true;
    }
    return false;
  }
}
