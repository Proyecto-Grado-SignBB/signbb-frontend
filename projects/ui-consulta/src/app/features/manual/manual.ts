import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Manual de usuario de la familia: texto fijo, sin llamadas al servidor, en
 * secciones que se abren y se cierran. Solo se ve con sesión de familia.
 */
@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manual.html',
  styleUrl: './manual.scss'
})
export class ManualComponent {
  /** Misma dirección que usa la pantalla de inicio (pendiente de confirmar con la asesora). */
  protected readonly urlFundacionCanguro = 'https://fundacioncanguro.co/';
}
