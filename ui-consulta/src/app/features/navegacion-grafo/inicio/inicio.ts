import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { BotonComponent } from '../../../shared/ui/boton/boton';
import { EtiquetaComponent } from '../../../shared/ui/etiqueta/etiqueta';
import { InsigniaIconoComponent } from '../../../shared/ui/insignia-icono/insignia-icono';
import { AvisoLegalComponent } from '../../../shared/ui/aviso-legal/aviso-legal';
import { MensajeErrorComponent } from '../../../shared/ui/mensaje-error/mensaje-error';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [BotonComponent, EtiquetaComponent, InsigniaIconoComponent, AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})

export class Inicio {
  cargando = false;
  error: string | null = null;

  constructor(
    private recorridoService: RecorridoService,
    private router: Router
  ) {}

comenzarConsulta(): void {
    this.error = null;
    this.cargando = true;
    this.recorridoService.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe({
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
}