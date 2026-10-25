import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MensajeErrorComponent } from 'ui-compartida';
import { RecorridoService } from '../../core/http/recorrido';
import { EstadoRecorrido, NivelAlerta, ResumenRecorridoDTO } from '../../models/recorrido.model';

/** Texto sencillo de cada nivel de alerta del resultado. */
export const ETIQUETA_NIVEL: Record<NivelAlerta, string> = {
  NORMAL: 'Sin señales de alarma',
  CONSULTAR_MEDICO: 'Consultar al médico',
  URGENCIA: 'Ir a urgencias'
};

/** Texto de los recorridos que ya no se pueden seguir (CU10/CU11). */
export const ETIQUETA_CERRADO: Partial<Record<EstadoRecorrido, string>> = {
  VENCIDO: 'Vencido',
  ABANDONADO: 'Reiniciado'
};

/**
 * «Mis recorridos»: las consultas de esta cuenta, de la más nueva a la más
 * vieja. Las que siguen en curso se continúan y las terminadas abren su
 * resultado.
 *
 * MODIFICADO (ítem 2.7): las vencidas tras 8 h sin actividad y las reiniciadas
 * se muestran con su etiqueta y sin botón, porque ya no se pueden seguir.
 */
@Component({
  selector: 'app-mis-recorridos',
  standalone: true,
  imports: [RouterLink, MensajeErrorComponent],
  templateUrl: './mis-recorridos.html',
  styleUrl: './mis-recorridos.scss'
})
export class MisRecorridosComponent implements OnInit {
  private readonly recorridos = inject(RecorridoService);
  private readonly router = inject(Router);

  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly etiquetaCerrado = ETIQUETA_CERRADO;
  /** Recorridos de la cuenta. */
  protected readonly lista = signal<ResumenRecorridoDTO[]>([]);
  /** True mientras se cargan. */
  protected readonly cargando = signal(true);
  /** Error de carga. */
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga (o recarga) la lista. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.recorridos.misRecorridos().subscribe({
      next: lista => {
        this.lista.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No pudimos cargar tus consultas. Intenta de nuevo.');
      }
    });
  }

  /** Continúa un recorrido en curso o abre el resultado de uno terminado. */
  protected abrir(r: ResumenRecorridoDTO): void {
    this.router.navigate([r.estado === 'FINALIZADO' ? '/resultado' : '/pregunta', r.recorridoId]);
  }

  /** Fecha corta y legible ("16 oct, 10:05"). */
  protected fecha(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
