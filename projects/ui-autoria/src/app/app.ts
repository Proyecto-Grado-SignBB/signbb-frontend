import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Componente raíz de la app del médico: solo aloja el `router-outlet`. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
