import { Component, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { AvisoLegalComponent, MensajeErrorComponent, SesionService } from 'ui-compartida';
import { MENSAJE_RECORRIDO_NO_DISPONIBLE, MENSAJE_RECORRIDO_VENCIDO } from '../../../core/sesion/sesion';

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
 */
export class Inicio implements OnInit {
  urlFundacionCanguro = 'https://fundacioncanguro.co/';

  /** True mientras se inicia el recorrido. */
  cargando = false;
  /** Mensaje de error si no se pudo iniciar la consulta. */
  error: string | null = null;
  /** Aviso al llegar desde un recorrido que no es de esta cuenta (`?aviso=recorrido`) o que venció o se reinició (`?aviso=vencido`). */
  aviso: string | null = null;

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
  }

  /** Inicia un recorrido y navega a la primera pregunta. */
  comenzarConsulta(): void {
    this.error = null;
    this.aviso = null;
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
}