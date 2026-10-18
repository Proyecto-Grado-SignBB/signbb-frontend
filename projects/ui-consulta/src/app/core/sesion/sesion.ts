import { Provider, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { API_URL, CLAVE_SESION, SesionService } from 'ui-compartida';
import { environment } from '../../../environments/environment';

/** Clave de `localStorage` de la sesión de esta app (distinta de la de autoría). */
export const CLAVE_SESION_CONSULTA = 'signbb.consulta.sesion';

/** Mensaje para una cuenta de médico que intenta entrar a la app de las familias. */
export const MENSAJE_CUENTA_CLINICA = 'Esta cuenta es de médico; usa la app de autoría.';

/** Aviso del inicio cuando un recorrido no es de esta cuenta o ya venció. */
export const MENSAJE_RECORRIDO_NO_DISPONIBLE = 'Ese recorrido no está disponible.';

/** Configuración de la sesión compartida para esta app; también la usan las specs. */
export function proveerSesion(): Provider[] {
  return [
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: CLAVE_SESION, useValue: CLAVE_SESION_CONSULTA }
  ];
}

/**
 * Mensaje sencillo para un error de ingreso o registro: el `mensaje` que manda
 * el back en los 401, 422 y 429 (ingreso bloqueado por intentos fallidos), o un
 * texto según el caso.
 */
export function mensajeCuenta(error: unknown, porDefecto: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return porDefecto;
  }
  if (error.status === 0) {
    return 'No hay conexión. Revisa tu internet e intenta de nuevo.';
  }
  const mensaje = (error.error as { mensaje?: unknown } | null)?.mensaje;
  if ((error.status === 401 || error.status === 422 || error.status === 429) && typeof mensaje === 'string' && mensaje) {
    return mensaje;
  }
  return porDefecto;
}

/** Ruta interna de `?volver=` (nunca otra página ni el propio ingreso), o el inicio. */
export function destinoSeguro(volver: string | null): string {
  return volver && volver.startsWith('/') && !volver.startsWith('//')
    && !volver.startsWith('/ingresar') && !volver.startsWith('/registro')
    ? volver
    : '/';
}

/**
 * True si el back respondió 404 a un recorrido: es de otra cuenta o ya venció
 * (para no revelar cuál, el back responde lo mismo).
 */
export function recorridoNoDisponible(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

/** Parámetros del inicio para que muestre {@link MENSAJE_RECORRIDO_NO_DISPONIBLE}. */
export const AVISO_RECORRIDO_NO_DISPONIBLE = { aviso: 'recorrido' };

/**
 * Guard del inicio: con sesión de familia deja pasar; sin ella lleva a la
 * bienvenida, conservando los parámetros (por ejemplo `?aviso=recorrido`).
 */
export const guardFamilia: CanActivateFn = ruta => {
  const sesion = inject(SesionService);
  return sesion.vigente() && sesion.tieneRol('PADRE')
    ? true
    : inject(Router).createUrlTree(['/bienvenida'], { queryParams: ruta.queryParams });
};
