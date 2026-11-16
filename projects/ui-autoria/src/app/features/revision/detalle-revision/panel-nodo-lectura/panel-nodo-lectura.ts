import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AutoriaService } from '../../../../core/http/autoria';
import {
  ETIQUETA_DESENLACE,
  ETIQUETA_GRAVEDAD,
  NodoLienzo
} from '../../../../models/lienzo.model';

/**
 * Detalle de un nodo en solo lectura, para el supervisor. Muestra el texto,
 * las imágenes de apoyo y las respuestas con su gravedad. No muestra el
 * destino de cada respuesta ni ofrece acciones de edición.
 */
@Component({
  selector: 'app-panel-nodo-lectura',
  standalone: true,
  templateUrl: './panel-nodo-lectura.html',
  styleUrl: './panel-nodo-lectura.scss'
})
export class PanelNodoLecturaComponent implements OnChanges, OnDestroy {
  private readonly autoria = inject(AutoriaService);

  /** Nodo que se está consultando. */
  @Input({ required: true }) nodo!: NodoLienzo;
  /** Id de la primera pregunta, para distinguirla. */
  @Input() inicio: string | null = null;
  /** Cierra el panel. */
  @Output() cerrar = new EventEmitter<void>();

  /** Texto legible de cada gravedad. */
  protected readonly etiquetaGravedad = ETIQUETA_GRAVEDAD;

  /** URL de objeto para cada imagen descargada con la sesión clínica. */
  protected imagenesUrl: Record<string, string> = {};
  private readonly urlsObjeto: string[] = [];
  private readonly imagenesPendientes = new Set<string>();
  private suscripcionesImagenes = new Subscription();

  /** Carga las imágenes cada vez que cambia el nodo. */
  ngOnChanges(): void {
    this.limpiarUrls();
    this.cargarImagenes();
  }

  /** Libera las URLs de objeto al cerrar el panel. */
  ngOnDestroy(): void {
    this.limpiarUrls();
  }

  /** True si el nodo es una pregunta. */
  protected get esPregunta(): boolean {
    return this.nodo.tipo === 'PREGUNTA';
  }

  /** True si es la primera pregunta del subgrafo. */
  protected get esInicio(): boolean {
    return this.nodo.id === this.inicio;
  }

  /** Título del panel según el tipo de nodo. */
  protected get titulo(): string {
    return this.esPregunta ? (this.esInicio ? 'Primera pregunta' : 'Pregunta') : 'Conclusión';
  }

  /** Desenlace legible de una conclusión. */
  protected get desenlace(): string {
    return this.nodo.desenlace ? ETIQUETA_DESENLACE[this.nodo.desenlace] : 'Sin desenlace';
  }

  /** Descarga las imágenes del nodo con el token de la sesión. */
  private cargarImagenes(): void {
    if (!this.esPregunta) {
      return;
    }
    for (const nombre of this.nodo.imagenes ?? []) {
      if (this.imagenesUrl[nombre] || this.imagenesPendientes.has(nombre)) {
        continue;
      }
      this.imagenesPendientes.add(nombre);
      this.suscripcionesImagenes.add(
        this.autoria.verImagen(nombre).subscribe({
          next: blob => {
            if (!this.nodo.imagenes?.includes(nombre)) {
              return;
            }
            const url = URL.createObjectURL(blob);
            this.imagenesUrl = { ...this.imagenesUrl, [nombre]: url };
            this.urlsObjeto.push(url);
            this.imagenesPendientes.delete(nombre);
          },
          error: () => this.imagenesPendientes.delete(nombre)
        })
      );
    }
  }

  /** Libera todas las URLs de objeto. */
  private limpiarUrls(): void {
    this.suscripcionesImagenes.unsubscribe();
    this.suscripcionesImagenes = new Subscription();
    this.urlsObjeto.forEach(url => URL.revokeObjectURL(url));
    this.urlsObjeto.length = 0;
    this.imagenesUrl = {};
    this.imagenesPendientes.clear();
  }
}
