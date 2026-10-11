import { Component, OnInit, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse, ResponderRequest } from '../../../models/recorrido.model';
import { BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent } from 'ui-compartida';
import { CarruselImagenesComponent } from '../carrusel-imagenes/carrusel-imagenes';

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

@Component({
  selector: 'app-pregunta',
  standalone: true,
  imports: [BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent, CarruselImagenesComponent],
  templateUrl: './pregunta.html',
  styleUrl: './pregunta.scss'
})
export class PreguntaComponent implements OnInit {
  respuesta = signal<RecorridoResponse | null>(null);
  seleccionActual = signal<string | null>(null);
  opcionesSeleccionadas = signal<Set<string>>(new Set());
  enviando = signal(false);
  /** True mientras «volver» está en curso o en su pausa anticlic (ver ENFRIAMIENTO_VOLVER_MS). */
  volviendo = signal(false);
  error = signal<string | null>(null);

  /**
   * Pregunta con imágenes de una sola respuesta: vista de comparación visual,
   * donde tocar una opción responde. Si es de selección múltiple se usa la
   * vista de selección, con las imágenes arriba.
   */
  esImagen = computed(() =>
    (this.respuesta()?.pregunta?.tieneImagenes ?? false) && !this.esSeleccionMultiple());

  esSeleccionMultiple = computed(() =>
    this.respuesta()?.pregunta?.tipoInteraccion === 'SELECCION_MULTIPLE');

  esBinaria = computed(() =>
    !this.esImagen() && !this.esSeleccionMultiple()
    && (this.respuesta()?.pregunta?.opciones.length ?? 0) <= 2);

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

  cargar(): void {
    this.error.set(null);
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => {
        this.respuesta.set(r);
        this.opcionesSeleccionadas.set(new Set());
      },
      error: () => this.error.set('No pudimos cargar la pregunta. Intenta de nuevo.')
    });
  }

  /**
   * Botón «volver» del encabezado: deshace la última respuesta en el backend y
   * muestra de nuevo la pregunta anterior para poder cambiarla. Si todavía no hay
   * ninguna respuesta (primera pregunta) el backend responde 400 y se sale al inicio.
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
        } else {
          this.error.set('No pudimos volver a la pregunta anterior. Intenta de nuevo.');
        }
      }
    });
  }

  etiqueta(valor: string): string {
    return ETIQUETAS_OPCION[valor] ?? valor;
  }

  seleccionar(valor: string): void {
    if (this.esBinaria() || this.esImagen()) {
      this.enviar(valor);
    } else {
      this.seleccionActual.set(valor);
    }
  }

  continuar(): void {
    const valor = this.seleccionActual();
    if (valor) {
      this.enviar(valor);
    }
  }

  estaSeleccionada(opcion: string): boolean {
    return this.opcionesSeleccionadas().has(opcion);
  }

  alternarOpcion(opcion: string): void {
    const actuales = new Set(this.opcionesSeleccionadas());
    if (actuales.has(opcion)) {
      actuales.delete(opcion);
    } else {
      actuales.add(opcion);
    }
    this.opcionesSeleccionadas.set(actuales);
  }

  continuarMultiple(): void {
    const opciones = Array.from(this.opcionesSeleccionadas());
    if (opciones.length === 0) {
      return;
    }
    this.enviarSolicitud({ opciones, tipo: 'SELECCION_MULTIPLE' });
  }

  private enviar(valor: string): void {
    this.enviarSolicitud({ respuesta: valor });
  }

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
      error: () => {
        this.enviando.set(false);
        this.error.set('No pudimos registrar tu respuesta. Intenta de nuevo.');
      }
    });
  }
}