import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BotonComponent } from 'ui-compartida';
import { ValidacionDTO } from '../../../models/autoria.model';

/**
 * Pantalla 5 (mockup): confirmación antes de publicar. El mockup original
 * muestra una lista de "qué cambió" (diff nuevo/editado/eliminado), pero esa
 * información no existe en el backend — GrafoAutoriaEntity solo guarda el
 * borrador y el publicado como dos strings JSON completos, sin historial de
 * cambios. En su lugar, esta pantalla muestra lo que sí es real: los conteos
 * actuales y las mismas advertencias estructurales de la Pantalla 2
 * (huérfanos, callejones sin salida, ciclos), recién recalculadas.
 */
@Component({
  selector: 'app-modal-publicar',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './modal-publicar.html',
  styleUrl: './modal-publicar.scss'
})
export class ModalPublicarComponent {
  @Input() nombreGrafo = '';
  @Input() conteoPreguntas = 0;
  @Input() conteoReglas = 0;
  @Input() validacion: ValidacionDTO | null = null;
  @Input() validando = false;
  @Input() publicando = false;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
