import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse } from '../../../models/recorrido.model';
import { BotonComponent, InsigniaIconoComponent, TonoInsignia, AvisoLegalComponent, MensajeErrorComponent } from 'ui-compartida';

/** Id del desenlace de sistema que el backend usa al cerrar por el máximo de preguntas. */
const ID_LIMITE_PREGUNTAS = 'sistema/limite_preguntas';

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

  /** True si el recorrido se cerró por el máximo de preguntas (desenlace de sistema). */
  cierrePorLimite = computed(
    () => this.respuesta()?.resultado?.destinoId === ID_LIMITE_PREGUNTAS
  );

  /**
   * Hay que listar las recomendaciones cuando son varias, o cuando el cierre fue por
   * el máximo de preguntas y se alcanzó alguna (el mensaje general va de introducción).
   */
  mostrarListaRecomendaciones = computed(() => {
    const resultado = this.respuesta()?.resultado;
    const cantidad = resultado?.recomendaciones?.length ?? 0;
    if (resultado?.nivel !== 'NORMAL') {
      return false;
    }
    return cantidad > 1 || (this.cierrePorLimite() && cantidad > 0);
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