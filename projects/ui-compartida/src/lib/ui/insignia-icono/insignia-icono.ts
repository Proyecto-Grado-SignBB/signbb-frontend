import { Component, Input } from '@angular/core';

export type TonoInsignia = 'marca' | 'calma' | 'alerta' | 'aviso';

@Component({
  selector: 'app-insignia-icono',
  standalone: true,
  templateUrl: './insignia-icono.html',
  styleUrl: './insignia-icono.scss'
})
export class InsigniaIconoComponent {
  @Input() tono: TonoInsignia = 'marca';
  @Input() tamano = 72;
  /** true = fondo sólido oscuro + ícono blanco (pantallas de resultado). */
  @Input() solido = false;
}