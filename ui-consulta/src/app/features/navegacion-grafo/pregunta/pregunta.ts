import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse, ResponderRequest } from '../../../models/recorrido.model';
import { BotonComponent } from '../../../shared/ui/boton/boton';
import { EtiquetaComponent } from '../../../shared/ui/etiqueta/etiqueta';
import { AvisoLegalComponent } from '../../../shared/ui/aviso-legal/aviso-legal';
import { MensajeErrorComponent } from '../../../shared/ui/mensaje-error/mensaje-error';

const ETIQUETAS_OPCION: Record<string, string> = {
  SI: 'Sí',
  NO: 'No',
  MENOS_DE_24_HORAS: 'Menos de 24 horas',
  MAS_DE_24_HORAS: 'Más de 24 horas'
};

const ORDEN_OPCIONES_IMAGEN = ['NO', 'SI'];

@Component({
  selector: 'app-pregunta',
  standalone: true,
  imports: [BotonComponent, EtiquetaComponent, AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './pregunta.html',
  styleUrl: './pregunta.scss'
})
export class PreguntaComponent implements OnInit {
  respuesta = signal<RecorridoResponse | null>(null);
  seleccionActual = signal<string | null>(null);
  opcionesSeleccionadas = signal<Set<string>>(new Set());
  enviando = signal(false);
  error = signal<string | null>(null);

  indiceImagen = signal(0);
  totalImagenes = 3;
  private inicioArrastreX = 0;

  esImagen = computed(() => this.respuesta()?.pregunta?.tieneImagenes ?? false);

  esSeleccionMultiple = computed(() =>
    !this.esImagen() && this.respuesta()?.pregunta?.tipoInteraccion === 'SELECCION_MULTIPLE');

  esBinaria = computed(() =>
    !this.esImagen() && !this.esSeleccionMultiple()
    && (this.respuesta()?.pregunta?.opciones.length ?? 0) <= 2);

  opcionesImagen = computed(() => {
    const opciones = this.respuesta()?.pregunta?.opciones ?? [];
    return [...opciones].sort(
      (a, b) => ORDEN_OPCIONES_IMAGEN.indexOf(a) - ORDEN_OPCIONES_IMAGEN.indexOf(b)
    );
  });

  private recorridoId = '';

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
      next: r => {
        this.respuesta.set(r);
        this.indiceImagen.set(0);
        this.opcionesSeleccionadas.set(new Set());
      },
      error: () => this.error.set('No pudimos cargar la pregunta. Intenta de nuevo.')
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  etiqueta(valor: string): string {
    return ETIQUETAS_OPCION[valor] ?? valor;
  }

  seleccionar(valor: string): void {
    if (this.esBinaria() || this.esImagen()) {
      this.enviar(valor);
    } else {
      this.seleccionActual.set(valor);
    }
  }

  continuar(): void {
    const valor = this.seleccionActual();
    if (valor) {
      this.enviar(valor);
    }
  }

  estaSeleccionada(opcion: string): boolean {
    return this.opcionesSeleccionadas().has(opcion);
  }

  alternarOpcion(opcion: string): void {
    const actuales = new Set(this.opcionesSeleccionadas());
    if (actuales.has(opcion)) {
      actuales.delete(opcion);
    } else {
      actuales.add(opcion);
    }
    this.opcionesSeleccionadas.set(actuales);
  }

  continuarMultiple(): void {
    const opciones = Array.from(this.opcionesSeleccionadas());
    if (opciones.length === 0) {
      return;
    }
    this.enviarSolicitud({ opciones, tipo: 'SELECCION_MULTIPLE' });
  }

  irAImagen(i: number): void {
    this.indiceImagen.set(Math.max(0, Math.min(this.totalImagenes - 1, i)));
  }

  onArrastreInicio(x: number): void {
    this.inicioArrastreX = x;
  }

  onArrastreFin(x: number): void {
    const delta = x - this.inicioArrastreX;
    if (delta < -35) this.irAImagen(this.indiceImagen() + 1);
    else if (delta > 35) this.irAImagen(this.indiceImagen() - 1);
  }

  private enviar(valor: string): void {
    this.enviarSolicitud({ respuesta: valor });
  }

  private enviarSolicitud(request: ResponderRequest): void {
    this.error.set(null);
    this.enviando.set(true);
    this.recorridoService.responder(this.recorridoId, request).subscribe({
      next: r => {
        this.enviando.set(false);
        this.seleccionActual.set(null);
        this.opcionesSeleccionadas.set(new Set());
        if (r.estado === 'FINALIZADO') {
          this.router.navigate(['/resultado', this.recorridoId]);
        } else {
          this.respuesta.set(r);
          this.indiceImagen.set(0);
        }
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No pudimos registrar tu respuesta. Intenta de nuevo.');
      }
    });
  }
}