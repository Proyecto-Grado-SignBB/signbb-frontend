import { Component, OnInit, signal } from '@angular/core';
import { BotonComponent, MensajeErrorComponent } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService } from '../../core/http/autoria';

/**
 * Pantalla 8: perfil del autor (médico).
 *
 * Todavía no existe autenticación real de médicos (ver sidebar-autoria: el
 * nombre es un valor fijo, no viene de una sesión). Esta pantalla deja lista
 * la vista a la que llegaría ese trabajo cuando se construya — por eso los
 * datos de identidad son de solo lectura y estáticos, igual que en el resto
 * de la interfaz. Los conteos de subgrafos sí son reales (vienen de GET
 * /autoria/subgrafos), pero son el total del sistema, no un filtro "solo los
 * míos": el autor es un texto libre, no un usuario autenticado, y sería
 * deshonesto mostrarlo como si ya distinguiera autores.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [SidebarAutoriaComponent, BotonComponent, MensajeErrorComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent implements OnInit {
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly conteoPublicados = signal(0);
  protected readonly conteoBorrador = signal(0);
  protected readonly ultimaPublicacion = signal<string | null>(null);

  protected readonly nombreMedico = 'Dra. Catalina Rodríguez';
  protected readonly institucion = 'Fundación Canguro';
  protected readonly correo = 'c.rodriguez@fundacioncanguro.co';
  protected readonly rol = 'Autor clínico';

  constructor(private autoria: AutoriaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.listar().subscribe({
      next: subgrafos => {
        const publicados = subgrafos.filter(g => g.publicadoEn !== null);
        this.conteoPublicados.set(publicados.length);
        this.conteoBorrador.set(subgrafos.filter(g => g.estado !== 'PUBLICADO').length);
        const masReciente = publicados
          .map(g => g.publicadoEn!)
          .sort()
          .at(-1);
        this.ultimaPublicacion.set(masReciente ? this.tiempoRelativo(masReciente) : null);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los subgrafos.');
        this.cargando.set(false);
      }
    });
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

  protected get iniciales(): string {
    const limpio = this.nombreMedico.replace(/^Dra?\.\s*/i, '');
    return limpio
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0])
      .join('')
      .toUpperCase();
  }
}
