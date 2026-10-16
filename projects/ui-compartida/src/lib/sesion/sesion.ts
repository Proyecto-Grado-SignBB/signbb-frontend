import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

/** Rol de una cuenta, como lo devuelve el back. */
export type Rol = 'PADRE' | 'MEDICO' | 'MEDICO_SUPERVISOR';

/** Cuenta de la sesión abierta (`UsuarioDTO` del back). */
export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  /** Institución del médico; nula en los padres. */
  institucion: string | null;
  activo: boolean;
}

/** Sesión abierta (`SesionDTO` del back): el token, cuándo vence y la cuenta. */
export interface Sesion {
  token: string;
  /** Fecha ISO en que vence el token. */
  expiraEn: string;
  usuario: UsuarioSesion;
}

/**
 * URL base de la API (por ejemplo `http://localhost:8080/api`). Solo a las
 * peticiones que empiezan por ella se les agrega el token.
 */
export const API_URL = new InjectionToken<string>('API_URL');

/**
 * Clave de `localStorage` donde la app guarda su sesión. Cada app usa la suya,
 * así ingresar en una no abre la otra.
 */
export const CLAVE_SESION = new InjectionToken<string>('CLAVE_SESION');

/**
 * Sesión de la cuenta que usa la app. Ingresa y registra contra `/auth` del
 * back, guarda la sesión en `localStorage` y la descarta si ya venció.
 * Requiere que la app provea {@link API_URL} y {@link CLAVE_SESION}.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly clave = inject(CLAVE_SESION);

  private readonly sesion = signal<Sesion | null>(this.leer());

  /** Cuenta de la sesión, o null si no hay sesión. */
  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  /** Token de la sesión, o null. */
  readonly token = computed(() => this.sesion()?.token ?? null);
  /** True si hay una sesión guardada. */
  readonly autenticado = computed(() => this.sesion() !== null);

  /** True si hay sesión y su rol es uno de `roles`. */
  tieneRol(...roles: Rol[]): boolean {
    const rol = this.usuario()?.rol;
    return rol !== undefined && roles.includes(rol);
  }

  /** True si hay una sesión que no ha vencido; si venció, la cierra. */
  vigente(): boolean {
    const actual = this.sesion();
    if (actual && vencida(actual)) {
      this.salir();
      return false;
    }
    return actual !== null;
  }

  /** Ingresa con correo y contraseña y guarda la sesión. Un 401 es credencial mala. */
  ingresar(correo: string, contrasena: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.apiUrl}/auth/login`, { correo, contrasena })
      .pipe(tap(s => this.guardar(s)));
  }

  /** Registra un padre o acudiente y deja la sesión abierta. Un 422 trae el motivo. */
  registrar(nombre: string, correo: string, contrasena: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.apiUrl}/auth/registro`, { nombre, correo, contrasena })
      .pipe(tap(s => this.guardar(s)));
  }

  /** Cierra la sesión y la borra de `localStorage`. */
  salir(): void {
    localStorage.removeItem(this.clave);
    this.sesion.set(null);
  }

  private guardar(sesion: Sesion): void {
    localStorage.setItem(this.clave, JSON.stringify(sesion));
    this.sesion.set(sesion);
  }

  /** Lee la sesión guardada; la descarta si está dañada o vencida. */
  private leer(): Sesion | null {
    const texto = localStorage.getItem(this.clave);
    if (!texto) {
      return null;
    }
    try {
      const sesion = JSON.parse(texto) as Sesion;
      if (sesion?.token && sesion.usuario && !vencida(sesion)) {
        return sesion;
      }
    } catch {
      // JSON dañado: se descarta igual que una sesión vencida.
    }
    localStorage.removeItem(this.clave);
    return null;
  }
}

/** True si el token ya venció (o su fecha no se entiende). */
function vencida(sesion: Sesion): boolean {
  const vence = Date.parse(sesion.expiraEn);
  return Number.isNaN(vence) || vence <= Date.now();
}
