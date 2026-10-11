import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Componente raíz de la app de la cuidadora: solo aloja el `router-outlet`. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Nombre del proyecto Angular (solo informativo). */
  protected readonly title = signal('ui-consulta');
}
