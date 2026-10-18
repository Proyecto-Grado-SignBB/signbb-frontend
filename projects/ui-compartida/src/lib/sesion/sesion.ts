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

/** Aviso del ingreso cuando la sesión terminó (`?motivo=sesion`): venció, la cerraron o se desactivó la cuenta. */
export const MENSAJE_SESION_TERMINADA = 'Tu sesión terminó. Ingresa de nuevo para continuar.';

/**
 * URL base de la API (por ejemplo `http://localhost:8080/api`). Solo a las
 * peticiones que empiezan por ella se les agrega el token.
 */
export const API_URL = new InjectionToken<string>('API_URL');

/**
 * Clave con la que la app guarda su sesión en el navegador. Cada app usa la
 * suya, así ingresar en una no abre la otra.
 */
export const CLAVE_SESION = new InjectionToken<string>('CLAVE_SESION');

/**
 * Sesión de la cuenta que usa la app. Ingresa y registra contra `/auth` del
 * back, guarda la sesión y la descarta si ya venció. Se guarda en
 * `localStorage` (sigue abierta al cerrar el navegador) salvo que el
 * dispositivo se indique como NO seguro: entonces va en `sessionStorage` y se
 * pierde al cerrar la pestaña. Requiere que la app provea {@link API_URL} y
 * {@link CLAVE_SESION}.
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

  /**
   * Ingresa con correo y contraseña y guarda la sesión. Un 401 es credencial
   * mala y un 429 es un ingreso bloqueado por intentos fallidos.
   *
   * `dispositivoSeguro` lo usan las familias: `true` mantiene la sesión abierta
   * más tiempo y la guarda en `localStorage`; `false` la guarda solo en
   * `sessionStorage`. Si no se indica (médicos), se guarda en `localStorage`.
   */
  ingresar(correo: string, contrasena: string, dispositivoSeguro?: boolean): Observable<Sesion> {
    const cuerpo = dispositivoSeguro === undefined
      ? { correo, contrasena }
      : { correo, contrasena, dispositivoSeguro };
    return this.http.post<Sesion>(`${this.apiUrl}/auth/login`, cuerpo)
      .pipe(tap(s => this.guardar(s, dispositivoSeguro)));
  }

  /**
   * Registra un padre o acudiente y deja la sesión abierta. Un 422 trae el
   * motivo. `dispositivoSeguro` funciona igual que en {@link ingresar}.
   */
  registrar(nombre: string, correo: string, contrasena: string, dispositivoSeguro?: boolean): Observable<Sesion> {
    const cuerpo = dispositivoSeguro === undefined
      ? { nombre, correo, contrasena }
      : { nombre, correo, contrasena, dispositivoSeguro };
    return this.http.post<Sesion>(`${this.apiUrl}/auth/registro`, cuerpo)
      .pipe(tap(s => this.guardar(s, dispositivoSeguro)));
  }

  /**
   * Cierra la sesión en todos los dispositivos (`POST /auth/cerrar-todas`) y,
   * si el back responde, también la de este navegador. Si falla, la sesión
   * local se conserva para poder reintentar.
   */
  cerrarTodas(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/cerrar-todas`, {})
      .pipe(tap(() => this.salir()));
  }

  /** Cierra la sesión y la borra del navegador. */
  salir(): void {
    localStorage.removeItem(this.clave);
    sessionStorage.removeItem(this.clave);
    this.sesion.set(null);
  }

  /** Guarda la sesión en `sessionStorage` si el dispositivo es NO seguro; si no, en `localStorage`. */
  private guardar(sesion: Sesion, dispositivoSeguro?: boolean): void {
    const persistente = dispositivoSeguro !== false;
    (persistente ? sessionStorage : localStorage).removeItem(this.clave);
    (persistente ? localStorage : sessionStorage).setItem(this.clave, JSON.stringify(sesion));
    this.sesion.set(sesion);
  }

  /** Lee la sesión guardada (en `localStorage` o `sessionStorage`); la descarta si está dañada o vencida. */
  private leer(): Sesion | null {
    for (const almacen of [localStorage, sessionStorage]) {
      const texto = almacen.getItem(this.clave);
      if (!texto) {
        continue;
      }
      try {
        const sesion = JSON.parse(texto) as Sesion;
        if (sesion?.token && sesion.usuario && !vencida(sesion)) {
          return sesion;
        }
      } catch {
        // JSON dañado: se descarta igual que una sesión vencida.
      }
      almacen.removeItem(this.clave);
    }
    return null;
  }
}

/** True si el token ya venció (o su fecha no se entiende). */
function vencida(sesion: Sesion): boolean {
  const vence = Date.parse(sesion.expiraEn);
  return Number.isNaN(vence) || vence <= Date.now();
}
