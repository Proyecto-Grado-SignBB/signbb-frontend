import { Component, Input } from '@angular/core';

/**
 * Ilustración animada y de fondo transparente que acompaña al título de la pantalla de resultado.
 * Es fija por nivel: carita feliz (NORMAL), médico (CONSULTAR_MEDICO) y hospital (URGENCIA).
 * Es decorativa: el significado ya lo da el título, por eso va oculta para lectores de pantalla.
 * Con "reducir movimiento" activo en el dispositivo, las animaciones se detienen.
 */
@Component({
  selector: 'app-ilustracion-resultado',
  standalone: true,
  templateUrl: './ilustracion-resultado.html',
  styleUrl: './ilustracion-resultado.scss'
})
export class IlustracionResultadoComponent {
  @Input() nivel: string | null | undefined;
}
