import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { AvisoLegalComponent, MensajeErrorComponent, SesionService } from 'ui-compartida';
import { MENSAJE_RECORRIDO_NO_DISPONIBLE, MENSAJE_RECORRIDO_VENCIDO } from '../../../core/sesion/sesion';
import { MENSAJE_CONSULTA_NO_DISPONIBLE } from '../../../core/consulta/mensajes';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
/**
 * Pantalla inicial de la familia con sesión (sin ella, el guard lleva a la
 * bienvenida): saluda por el nombre, arranca el recorrido y lleva a «Mis
 * recorridos», al manual de usuario y al perfil, donde se cierra la sesión.
 *
 * Si no hay ningún subgrafo publicado, la consulta se muestra deshabilitada.
 */
export class Inicio implements OnInit {
  urlFundacionCanguro = 'https://fundacioncanguro.co/';

  /** True mientras se inicia el recorrido. */
  cargando = false;
  /** Mensaje de error si no se pudo iniciar la consulta. */
  error: string | null = null;
  /** Aviso al llegar desde un recorrido que no es de esta cuenta (`?aviso=recorrido`) o que venció o se reinició (`?aviso=vencido`). */
  aviso: string | null = null;
  /**
   * True si hay subgrafos publicados, false si no, y null mientras se
   * comprueba. Mientras sea null el botón queda deshabilitado para no iniciar
   * una consulta que el backend rechazaría.
   */
  readonly disponible = signal<boolean | null>(null);
  /** True si la consulta no está disponible y hay que mostrar el aviso. */
  readonly noDisponible = computed(() => this.disponible() === false);
  /** Texto del aviso cuando no hay subgrafos publicados. */
  readonly mensajeNoDisponible = MENSAJE_CONSULTA_NO_DISPONIBLE;

  /** Nombre de la familia con sesión. */
  readonly nombre = computed(() => this.sesion.usuario()?.nombre ?? null);

  constructor(
    private recorridoService: RecorridoService,
    private router: Router,
    private ruta: ActivatedRoute,
    private sesion: SesionService
  ) { }

  ngOnInit(): void {
    const aviso = this.ruta.snapshot.queryParamMap.get('aviso');
    if (aviso === 'recorrido') {
      this.aviso = MENSAJE_RECORRIDO_NO_DISPONIBLE;
    } else if (aviso === 'vencido') {
      this.aviso = MENSAJE_RECORRIDO_VENCIDO;
    }
    this.comprobarDisponibilidad();
  }

  /** Consulta si hay subgrafos publicados; si falla, deja intentar la consulta. */
  private comprobarDisponibilidad(): void {
    this.recorridoService.disponibilidad().subscribe({
      next: respuesta => this.disponible.set(respuesta.disponible),
      error: () => this.disponible.set(true)
    });
  }

  /** Inicia un recorrido y navega a la primera pregunta. */
  comenzarConsulta(): void {
    if (this.disponible() !== true || this.cargando) {
      return;
    }
    this.error = null;
    this.aviso = null;
    this.cargando = true;
    this.recorridoService.iniciar().subscribe({
      next: respuesta => {
        this.cargando = false;
        this.router.navigate(['/pregunta', respuesta.recorridoId]);
      },
      error: error => {
        this.cargando = false;
        const mensaje = error instanceof HttpErrorResponse
          ? (error.error as { mensaje?: unknown } | null)?.mensaje
          : null;
        if (error instanceof HttpErrorResponse && error.status === 503 && typeof mensaje === 'string' && mensaje) {
          this.disponible.set(false);
          return;
        }
        this.error = 'No pudimos iniciar la consulta. Intenta de nuevo.';
      }
    });
  }
}
