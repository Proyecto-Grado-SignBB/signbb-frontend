import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AvisoLegalComponent, BotonComponent, SesionService } from 'ui-compartida';

/** Un paso de la explicación de la bienvenida. */
interface PasoBienvenida {
  titulo: string;
  texto: string;
}

/**
 * Bienvenida de las familias: explica en tres pasos para qué sirve Canguritos y
 * lleva a crear la cuenta o a ingresar. Es lo primero que ve quien no tiene
 * sesión; con sesión de familia pasa directo al inicio.
 */
@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [RouterLink, BotonComponent, AvisoLegalComponent],
  templateUrl: './bienvenida.html',
  styleUrl: './bienvenida.scss'
})
export class BienvenidaComponent implements OnInit {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** Qué hace la herramienta, en palabras sencillas. */
  protected readonly pasos: PasoBienvenida[] = [
    { titulo: 'Cuéntanos qué ves', texto: 'Responde preguntas sencillas sobre lo que notas en tu bebé.' },
    {
      titulo: 'Recibe una recomendación clara',
      texto: 'Te decimos si todo está tranquilo, si conviene consultar al médico o si debes ir a urgencias.'
    },
    { titulo: 'Tus consultas, guardadas', texto: 'Quedan en tu cuenta para que puedas volver a verlas.' }
  ];

  ngOnInit(): void {
    if (this.sesion.vigente() && this.sesion.tieneRol('PADRE')) {
      this.router.navigate(['/']);
    }
  }

  /** Lleva a crear la cuenta. */
  protected crearCuenta(): void {
    this.router.navigate(['/registro']);
  }
}
