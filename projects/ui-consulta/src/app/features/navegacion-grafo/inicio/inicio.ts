import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { AvisoLegalComponent, MensajeErrorComponent } from 'ui-compartida';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  /** TODO: confirma con tu asesora si hay una sección específica del portal (recomendaciones/padres) en vez de la home. */
  urlFundacionCanguro = 'https://fundacioncanguro.co/';

  cargando = false;
  error: string | null = null;

  constructor(
    private recorridoService: RecorridoService,
    private router: Router
  ) { }

  comenzarConsulta(): void {
    this.error = null;
    this.cargando = true;
    this.recorridoService.iniciar().subscribe({
      next: respuesta => {
        this.cargando = false;
        this.router.navigate(['/pregunta', respuesta.recorridoId]);
      },
      error: () => {
        this.cargando = false;
        this.error = 'No pudimos iniciar la consulta. Intenta de nuevo.';
      }
    });
  }

  abrirManualUsuario(): void {
    // TODO: sin destino definido todavía en el diseño.
  }
}