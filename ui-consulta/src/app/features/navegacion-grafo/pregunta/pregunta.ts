import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecorridoService } from '../../../core/http/recorrido';
import { RecorridoResponse } from '../../../models/recorrido.model';
import { BotonComponent } from '../../../shared/ui/boton/boton';
import { AvisoLegalComponent } from '../../../shared/ui/aviso-legal/aviso-legal';
import { MensajeErrorComponent } from '../../../shared/ui/mensaje-error/mensaje-error';

@Component({
  selector: 'app-pregunta',
  standalone: true,
  imports: [BotonComponent, AvisoLegalComponent, MensajeErrorComponent],
  templateUrl: './pregunta.html',
  styleUrl: './pregunta.scss'
})

export class PreguntaComponent implements OnInit {
  respuesta = signal<RecorridoResponse | null>(null);
  seleccionActual = signal<string | null>(null);
  enviando = signal(false);
  error = signal<string | null>(null);

  esBinaria = computed(() => (this.respuesta()?.nodoActual?.opciones.length ?? 0) <= 2);

  private recorridoId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recorridoService: RecorridoService
  ) {}

  ngOnInit(): void {
    this.recorridoId = Number(this.route.snapshot.paramMap.get('recorridoId')!);
    this.cargar();
  }

  cargar(): void {
    this.error.set(null);
    this.recorridoService.consultar(this.recorridoId).subscribe({
      next: r => this.respuesta.set(r),
      error: () => this.error.set('No pudimos cargar la pregunta. Intenta de nuevo.')
    });
  }

  seleccionar(valor: string): void {
    if (this.esBinaria()) {
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

  private enviar(valor: string): void {
    this.error.set(null);
    this.enviando.set(true);
    this.recorridoService.responder(this.recorridoId, { respuesta: valor }).subscribe({
      next: r => {
        this.enviando.set(false);
        this.seleccionActual.set(null);
        if (r.estado === 'FINALIZADO') {
          this.router.navigate(['/resultado', this.recorridoId]);
        } else {
          this.respuesta.set(r);
        }
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No pudimos registrar tu respuesta. Intenta de nuevo.');
      }
    });
  }
}