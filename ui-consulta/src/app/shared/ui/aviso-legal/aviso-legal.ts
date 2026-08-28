import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  templateUrl: './aviso-legal.html',
  styleUrl: './aviso-legal.scss'
})
export class AvisoLegalComponent {
  @Input() texto =
    'SignBB ofrece orientación de apoyo y no reemplaza la valoración ni el criterio de un profesional de salud.';
}