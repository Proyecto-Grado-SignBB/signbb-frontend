import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BotonComponent, EtiquetaComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService } from '../../../core/http/autoria';
import { CrearGrafoRequest, GrafoResumenDTO } from '../../../models/autoria.model';

/** Pantalla 1: tablero de grafos clínicos del médico. */
@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [FormsModule, SidebarAutoriaComponent, BotonComponent, EtiquetaComponent, MensajeErrorComponent],
  templateUrl: './tablero.html',
  styleUrl: './tablero.scss'
})
export class TableroComponent implements OnInit {
  protected readonly grafos = signal<GrafoResumenDTO[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly mostrarFormularioCrear = signal(false);
  protected readonly creando = signal(false);
  protected nombreNuevo = '';
  protected autorNuevo = '';
  protected institucionNuevo = '';

  protected readonly totalPublicados = computed(
    () => this.grafos().filter(g => g.estado === 'Publicado').length
  );
  protected readonly totalBorradores = computed(
    () => this.grafos().filter(g => g.estado === 'Borrador').length
  );
  protected readonly totalPreguntas = computed(
    () => this.grafos().reduce((acc, g) => acc + g.conteoPreguntas, 0)
  );

  constructor(private autoria: AutoriaService, private router: Router) {}

  ngOnInit(): void {
    this.cargarGrafos();
  }

  protected cargarGrafos(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.listar().subscribe({
      next: grafos => {
        this.grafos.set(grafos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de grafos. Verifica que el backend esté disponible.');
        this.cargando.set(false);
      }
    });
  }

  protected abrirFormularioCrear(): void {
    this.mostrarFormularioCrear.set(true);
  }

  protected cancelarCrear(): void {
    this.mostrarFormularioCrear.set(false);
    this.nombreNuevo = '';
    this.autorNuevo = '';
    this.institucionNuevo = '';
  }

  protected get puedeCrear(): boolean {
    return this.nombreNuevo.trim().length > 0
      && this.autorNuevo.trim().length > 0
      && this.institucionNuevo.trim().length > 0;
  }

  protected confirmarCrear(): void {
    if (!this.puedeCrear || this.creando()) {
      return;
    }
    const request: CrearGrafoRequest = {
      nombre: this.nombreNuevo.trim(),
      autor: this.autorNuevo.trim(),
      institucion: this.institucionNuevo.trim()
    };
    this.creando.set(true);
    this.autoria.crear(request).subscribe({
      next: () => {
        this.creando.set(false);
        this.cancelarCrear();
        this.cargarGrafos();
      },
      error: () => {
        this.creando.set(false);
        this.error.set('No se pudo crear el grafo. Intenta de nuevo.');
      }
    });
  }

  protected abrirGrafo(id: number): void {
    this.router.navigate(['/grafos', id]);
  }

  protected tonoEstado(estado: string): 'calma' | 'aviso' {
    return estado === 'Publicado' ? 'calma' : 'aviso';
  }

  protected resumenGrafo(grafo: GrafoResumenDTO): string {
    const preguntas = `${grafo.conteoPreguntas} pregunta${grafo.conteoPreguntas === 1 ? '' : 's'} y desenlaces`;
    const reglas = `${grafo.conteoReglas} regla${grafo.conteoReglas === 1 ? '' : 's'} de alerta`;
    if (grafo.estado === 'Borrador' && grafo.conteoReglas === 0 && grafo.conteoPreguntas === 0) {
      return 'Grafo nuevo, sin contenido todavía';
    }
    return `${preguntas} · ${reglas} · editado ${this.tiempoRelativo(grafo.actualizadoEn)}`;
  }

  private tiempoRelativo(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }
    const diffDias = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias <= 0) return 'hoy';
    if (diffDias === 1) return 'hace 1 día';
    if (diffDias < 30) return `hace ${diffDias} días`;
    const diffMeses = Math.floor(diffDias / 30);
    return diffMeses === 1 ? 'hace 1 mes' : `hace ${diffMeses} meses`;
  }
}
