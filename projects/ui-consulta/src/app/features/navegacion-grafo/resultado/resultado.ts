import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse } from '../../../models/recorrido.model';
import { etiquetaOpcion } from '../../../models/etiquetas-opcion';
import { IlustracionResultadoComponent } from '../ilustracion-resultado/ilustracion-resultado';
import { TelefonoPediatraComponent } from '../../cuenta/telefono-pediatra/telefono-pediatra';
import {
  AVISO_RECORRIDO_NO_DISPONIBLE, AVISO_RECORRIDO_VENCIDO, recorridoNoDisponible, recorridoVencido
} from '../../../core/sesion/sesion';
import { LINEA_EMERGENCIA, enlaceTelefono } from '../../../core/emergencia/emergencia';
import {
  BotonComponent, InsigniaIconoComponent, TonoInsignia, AvisoLegalComponent, MensajeErrorComponent, SesionService
} from 'ui-compartida';

/** Id del desenlace de sistema que el backend usa al cerrar por el máximo de preguntas. */
const ID_LIMITE_PREGUNTAS = 'sistema/limite_preguntas';

/** Una pregunta del recorrido con la respuesta que dio el padre. */
export interface PasoLegible {
  pregunta: string;
  respuesta: string;
}

/**
 * Pantalla del desenlace: muestra el nivel de alerta, el mensaje y las
 * recomendaciones del recorrido finalizado. Permite corregir la última
 * respuesta, volver al inicio o empezar otra consulta.
 *
 * MODIFICADO (ítems 2.4 y 2.6): en URGENCIA, «Buscar ayuda ahora» llama a la
 * línea 123 y se anuncia «Urgencias cercanas» como función próxima. En
 * CONSULTAR_MEDICO, «Contactar a mi pediatra» abre un panel con la guía de qué
 * contarle, la llamada al número guardado (o el formulario para guardarlo) y la
 * línea 123. En las dos alertas, «¿Por qué este resultado?» muestra las reglas
 * que dispararon y las preguntas con la respuesta dada. Un recorrido vencido
 * (410) vuelve al inicio con su aviso.
 */
@Component({
  selector: 'app-resultado',
  standalone: true,
  imports: [
    IlustracionResultadoComponent, BotonComponent, InsigniaIconoComponent, AvisoLegalComponent, MensajeErrorComponent,
    TelefonoPediatraComponent
  ],
  templateUrl: './resultado.html',
  styleUrl: './resultado.scss'
})
export class ResultadoComponent implements OnInit {
  /** Estado del recorrido finalizado. */
  respuesta = signal<RecorridoResponse | null>(null);
  /** Mensaje de error de la última operación. */
  error = signal<string | null>(null);
  /** True si el panel «Contactar a mi pediatra» está abierto. */
  panelPediatra = signal(false);
  /** Enlace para llamar a la línea de emergencias. */
  readonly enlaceEmergencia = enlaceTelefono(LINEA_EMERGENCIA);
  /** Número de la línea de emergencias, para mostrarlo. */
  readonly lineaEmergencia = LINEA_EMERGENCIA;
  private recorridoId = '';
  private readonly sesion = inject(SesionService);

  /** Teléfono del pediatra guardado en la cuenta, o null. */
  telefonoPediatra = computed(() => this.sesion.usuario()?.telefonoPediatra ?? null);

  /** Enlace `tel:` del pediatra, o null si no hay número guardado. */
  enlacePediatra = computed(() => {
    const telefono = this.telefonoPediatra();
    return telefono ? enlaceTelefono(telefono) : null;
  });

  /**
   * Preguntas del camino causal con la respuesta dada. Cada paso trae como
   * condición la respuesta a la pregunta del paso anterior, así que se emparejan
   * de a dos; se omiten los pasos sin texto (backends anteriores).
   */
  pasosLegibles = computed<PasoLegible[]>(() => {
    const camino = this.respuesta()?.resultado?.caminoCausal ?? [];
    const pasos: PasoLegible[] = [];
    for (let i = 1; i < camino.length; i++) {
      const pregunta = camino[i - 1].contenido;
      if (pregunta && camino[i].condicion) {
        pasos.push({ pregunta, respuesta: etiquetaOpcion(camino[i].condicion) });
      }
    }
    return pasos;
  });

  /** True si el resultado es una alerta y hay algo que explicar en «¿Por qué este resultado?». */
  mostrarPorQue = computed(() => {
    const resultado = this.respuesta()?.resultado;
    const alerta = resultado?.nivel === 'URGENCIA' || resultado?.nivel === 'CONSULTAR_MEDICO';
    return alerta && ((resultado?.razones.length ?? 0) > 0 || this.pasosLegibles().length > 0);
  });

  /** Tono de la insignia según el nivel de alerta del resultado. */
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

  /** Carga el desenlace del recorrido. */
  cargar(): void {
    this.error.set(null);
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => this.respuesta.set(r),
      error: e => {
        if (this.salirSiNoSigue(e)) {
          return;
        }
        this.error.set('No pudimos cargar el resultado. Intenta de nuevo.');
      }
    });
  }

  /** Vuelve a la pantalla inicial. */
  volverAlInicio(): void {
    this.router.navigate(['/']);
  }

  /** Deshace la última respuesta y vuelve a la pregunta que cerró el recorrido. */
  corregirUltimaRespuesta(): void {
    this.error.set(null);
    this.recorridoService.retroceder(this.recorridoId).subscribe({
      next: r => this.router.navigate(['/pregunta', r.recorridoId]),
      error: e => {
        if (this.salirSiNoSigue(e)) {
          return;
        }
        this.error.set('No pudimos volver a la pregunta anterior. Intenta de nuevo.');
      }
    });
  }

  /** Inicia un recorrido nuevo desde el resultado. */
  comenzarOtraConsulta(): void {
    this.error.set(null);
    this.recorridoService.iniciar().subscribe({
      next: r => this.router.navigate(['/pregunta', r.recorridoId]),
      error: e => {
        const mensaje = e instanceof HttpErrorResponse ? (e.error as { mensaje?: unknown } | null)?.mensaje : null;
        if (e instanceof HttpErrorResponse && e.status === 503 && typeof mensaje === 'string' && mensaje) {
          this.error.set(mensaje);
          return;
        }
        this.error.set('No pudimos iniciar una nueva consulta. Intenta de nuevo.');
      }
    });
  }

  /** Abre o cierra el panel «Contactar a mi pediatra». */
  alternarPanelPediatra(): void {
    this.panelPediatra.update(abierto => !abierto);
  }

  /**
   * Si el recorrido ya no está disponible (404) o venció (410), vuelve al inicio
   * con el aviso que corresponde.
   *
   * @returns true si salió de la pantalla
   */
  private salirSiNoSigue(e: unknown): boolean {
    if (recorridoNoDisponible(e)) {
      this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_NO_DISPONIBLE });
      return true;
    }
    if (recorridoVencido(e)) {
      this.router.navigate(['/'], { queryParams: AVISO_RECORRIDO_VENCIDO });
      return true;
    }
    return false;
  }
}
