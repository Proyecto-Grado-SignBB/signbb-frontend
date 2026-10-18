import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL, SesionService } from './sesion';

/**
 * Agrega `Authorization: Bearer` a las peticiones hacia {@link API_URL} (y a
 * ninguna otra). Si la API responde 401 fuera del ingreso y el registro, la
 * sesión terminó: la cierra y lleva a `/ingresar?motivo=sesion&volver=<ruta
 * actual>`, para que el ingreso avise por qué y regrese a donde estaba.
 */
export const interceptorSesion: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const apiUrl = inject(API_URL);

  const haciaApi = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);
  const token = sesion.token();
  const peticion = haciaApi && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const deIngreso = req.url.startsWith(`${apiUrl}/auth/login`)
        || req.url.startsWith(`${apiUrl}/auth/registro`);
      if (haciaApi && !deIngreso && error instanceof HttpErrorResponse && error.status === 401) {
        sesion.salir();
        const volver = router.url.startsWith('/ingresar') ? undefined : router.url;
        router.navigate(['/ingresar'], { queryParams: volver ? { motivo: 'sesion', volver } : { motivo: 'sesion' } });
      }
      return throwError(() => error);
    })
  );
};
