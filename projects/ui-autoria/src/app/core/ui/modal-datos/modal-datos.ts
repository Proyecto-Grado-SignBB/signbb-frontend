import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonComponent } from 'ui-compartida';
import { AYUDA_NOMBRE_FAMILIA } from '../../../models/lienzo.model';

/** Datos editables de un subgrafo ya creado. */
export interface DatosSubgrafo {
  nombre: string;
  etiquetaOpcion: string;
}

/**
 * Edita el nombre técnico y el nombre para la familia de un subgrafo. La
 * categoría se muestra pero no cambia aquí. Si el subgrafo ya estaba
 * publicado, los cambios llegan a las cuidadoras al volver a publicar.
 */
@Component({
  selector: 'app-modal-datos',
  standalone: true,
  imports: [FormsModule, BotonComponent],
  templateUrl: './modal-datos.html',
  styleUrl: './modal-datos.scss'
})
export class ModalDatosComponent implements OnChanges {
  /** Texto de ayuda del campo «Nombre para la familia». */
  protected readonly ayudaNombreFamilia = AYUDA_NOMBRE_FAMILIA;

  /** Datos actuales del subgrafo. */
  @Input({ required: true }) datos!: DatosSubgrafo;
  /** Categoría del subgrafo (solo lectura aquí). */
  @Input() categoria = '';
  /** True si el subgrafo ya está publicado. */
  @Input() publicado = false;
  /** True mientras se guardan los cambios. */
  @Input() guardando = false;
  /** Error a mostrar si el guardado falla. */
  @Input() error: string | null = null;

  /** Emite los datos editados al guardar. */
  @Output() guardar = new EventEmitter<DatosSubgrafo>();
  /** Emite al cancelar o pulsar Escape. */
  @Output() cancelar = new EventEmitter<void>();

  protected nombre = '';
  protected etiquetaOpcion = '';
  protected tocadoEtiqueta = false;

  /** Reinicia los campos cuando cambian los datos de entrada. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['datos']) {
      this.nombre = this.datos.nombre;
      this.etiquetaOpcion = this.datos.etiquetaOpcion;
      this.tocadoEtiqueta = false;
    }
  }

  /** True si el nombre y el nombre para la familia no están vacíos. */
  protected get valido(): boolean {
    return this.nombre.trim().length > 0 && this.etiquetaOpcion.trim().length > 0;
  }

  /** Cierra el modal con Escape si no se está guardando. */
  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.guardando) {
      this.cancelar.emit();
    }
  }

  /** Emite los datos si el formulario es válido y no se está guardando. */
  protected enviar(): void {
    this.tocadoEtiqueta = true;
    if (this.valido && !this.guardando) {
      this.guardar.emit({ nombre: this.nombre.trim(), etiquetaOpcion: this.etiquetaOpcion.trim() });
    }
  }
}
