import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse } from '../../../models/recorrido.model';
import { BotonComponent } from '../../../shared/ui/boton/boton';
import { InsigniaIconoComponent, TonoInsignia } from '../../../shared/ui/insignia-icono/insignia-icono';
import { AvisoLegalComponent } from '../../../shared/ui/aviso-legal/aviso-legal';
import { MensajeErrorComponent } from '../../../shared/ui/mensaje-error/mensaje-error';

@Component({
  selector: 'app-resultado',
  standalone: true,
  imports: [BotonComponent, InsigniaIconoComponent, AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './resultado.html',
  styleUrl: './resultado.scss'
})
export class ResultadoComponent implements OnInit {
  respuesta = signal<RecorridoResponse | null>(null);
  error = signal<string | null>(null);
  private recorridoId = '';

  tonoInsignia = computed<TonoInsignia>(() => {
    switch (this.respuesta()?.resultado?.nivel) {
      case 'URGENCIA': return 'alerta';
      case 'CONSULTAR_MEDICO': return 'aviso';
      default: return 'calma';
    }
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recorridoService: RecorridoService
  ) { }

  ngOnInit(): void {
    this.recorridoId = this.route.snapshot.paramMap.get('recorridoId')!;
    this.cargar();
  }

  cargar(): void {
    this.error.set(null);
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => this.respuesta.set(r),
      error: () => this.error.set('No pudimos cargar el resultado. Intenta de nuevo.')
    });
  }

  volverAlInicio(): void {
    this.router.navigate(['/']);
  }

  comenzarOtraConsulta(): void {
    this.error.set(null);
    this.recorridoService.iniciar().subscribe({
      next: r => this.router.navigate(['/pregunta', r.recorridoId]),
      error: () => this.error.set('No pudimos iniciar una nueva consulta. Intenta de nuevo.')
    });
  }
}