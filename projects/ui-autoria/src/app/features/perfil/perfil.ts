import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BotonComponent, MensajeErrorComponent, SesionService, UsuarioSesion } from 'ui-compartida';
import { SidebarAutoriaComponent } from '../../core/layout/sidebar-autoria/sidebar-autoria';
import { AutoriaService } from '../../core/http/autoria';
import { ETIQUETA_ROL, iniciales } from '../../core/sesion/sesion';

/**
 * Pantalla 8: perfil del médico de la sesión. Los datos de la cuenta vienen
 * de `GET /auth/yo` (mientras carga, se muestran los de la sesión) y los
 * conteos son de los subgrafos de los que es autor. Solo lectura: las cuentas
 * las administra un supervisor.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [SidebarAutoriaComponent, BotonComponent, MensajeErrorComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent implements OnInit {
  private readonly autoria = inject(AutoriaService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** True mientras se cargan los conteos. */
  protected readonly cargando = signal(true);
  /** Error a mostrar si falla la carga. */
  protected readonly error = signal<string | null>(null);
  /** Número de subgrafos propios publicados. */
  protected readonly conteoPublicados = signal(0);
  /** Número de subgrafos propios que no están publicados. */
  protected readonly conteoBorrador = signal(0);
  /** Fecha relativa de la última publicación propia, o nula. */
  protected readonly ultimaPublicacion = signal<string | null>(null);

  /** Cuenta que se muestra: la de `/auth/yo` o, mientras llega, la de la sesión. */
  protected readonly cuenta = signal<UsuarioSesion | null>(this.sesion.usuario());
  /** Rol legible. */
  protected readonly rol = computed(() => {
    const rol = this.cuenta()?.rol;
    return rol ? ETIQUETA_ROL[rol] : '';
  });
  /** Iniciales del nombre, para el avatar. */
  protected readonly iniciales = computed(() => iniciales(this.cuenta()?.nombre ?? ''));

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga la cuenta y sus subgrafos, y calcula los conteos del perfil. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.autoria.cuenta().subscribe({
      next: cuenta => this.cuenta.set(cuenta),
      error: () => undefined
    });
    this.autoria.listar().subscribe({
      next: todos => {
        // Un supervisor recibe todos los subgrafos: el perfil cuenta solo los suyos.
        const subgrafos = todos.filter(g => g.autorId === this.cuenta()?.id);
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

  /** Cierra la sesión y lleva al ingreso. */
  protected salir(): void {
    this.sesion.salir();
    this.router.navigate(['/ingresar'], { replaceUrl: true });
  }

  /** Convierte una fecha ISO en texto relativo ("hoy", "hace 3 días"). */
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
