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
  protected readonly ayudaNombreFamilia = AYUDA_NOMBRE_FAMILIA;

  @Input({ required: true }) datos!: DatosSubgrafo;
  @Input() categoria = '';
  @Input() publicado = false;
  @Input() guardando = false;
  @Input() error: string | null = null;

  @Output() guardar = new EventEmitter<DatosSubgrafo>();
  @Output() cancelar = new EventEmitter<void>();

  protected nombre = '';
  protected etiquetaOpcion = '';
  protected tocadoNombre = false;
  protected tocadoEtiqueta = false;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['datos']) {
      this.nombre = this.datos.nombre;
      this.etiquetaOpcion = this.datos.etiquetaOpcion;
      this.tocadoNombre = false;
      this.tocadoEtiqueta = false;
    }
  }

  protected get valido(): boolean {
    return this.nombre.trim().length > 0 && this.etiquetaOpcion.trim().length > 0;
  }

  @HostListener('document:keydown.escape')
  protected cerrar(): void {
    if (!this.guardando) {
      this.cancelar.emit();
    }
  }

  protected enviar(): void {
    this.tocadoNombre = true;
    this.tocadoEtiqueta = true;
    if (this.valido && !this.guardando) {
      this.guardar.emit({ nombre: this.nombre.trim(), etiquetaOpcion: this.etiquetaOpcion.trim() });
    }
  }
}
