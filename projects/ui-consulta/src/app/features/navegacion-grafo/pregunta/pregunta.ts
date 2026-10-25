import { Component, OnInit, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse, ResponderRequest } from '../../../models/recorrido.model';
import { BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent } from 'ui-compartida';
import { CarruselImagenesComponent } from '../carrusel-imagenes/carrusel-imagenes';
import { AVISO_RECORRIDO_NO_DISPONIBLE, recorridoNoDisponible } from '../../../core/sesion/sesion';

const ETIQUETAS_OPCION: Record<string, string> = {
  SI: 'Sí',
  NO: 'No',
  MENOS_DE_24_HORAS: 'Menos de 24 horas',
  MAS_DE_24_HORAS: 'Más de 24 horas',
  SOMNOLENCIA: 'Somnoliento o letárgico',
  SANGRE_EN_HECES: 'Sangre en las heces',
  NINGUNO: 'Ninguno de estos',
  COME_MENOS: 'Se alimenta menos de lo habitual',
  AMARILLO_SE_EXTIENDE: 'El amarillo se está extendiendo'
};

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
        if (recorridoNoDisponible(e)) {
          this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_NO_DISPONIBLE });
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
   * y se sale al inicio.
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
          this.router.navigate(['/']);
        } else if (recorridoNoDisponible(e)) {
          this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_NO_DISPONIBLE });
        } else {
          this.error.set('No pudimos volver a la pregunta anterior. Intenta de nuevo.');
        }
      }
    });
  }

  /** Texto legible de una opción; si no hay traducción, usa el valor crudo. */
  etiqueta(valor: string): string {
    return ETIQUETAS_OPCION[valor] ?? valor;
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
    this.recorridoService.responder(this.recorridoId, request).subscribe({
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
        if (recorridoNoDisponible(e)) {
          this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_NO_DISPONIBLE });
          return;
        }
        this.error.set('No pudimos registrar tu respuesta. Intenta de nuevo.');
      }
    });
  }
}