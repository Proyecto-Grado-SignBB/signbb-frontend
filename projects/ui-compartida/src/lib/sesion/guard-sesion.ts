import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol, SesionService } from './sesion';

/**
 * Guard de las rutas que piden sesión. Sin sesión vigente lleva a
 * `/ingresar?volver=<ruta>`; con sesión de otro rol, a `/ingresar?motivo=rol`.
 * Sin roles, basta con tener sesión.
 */
export function guardSesion(...roles: Rol[]): CanActivateFn {
  return (_ruta, estado) => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    if (!sesion.vigente()) {
      return router.createUrlTree(['/ingresar'], { queryParams: { volver: estado.url } });
    }
    if (roles.length > 0 && !sesion.tieneRol(...roles)) {
      return router.createUrlTree(['/ingresar'], { queryParams: { motivo: 'rol' } });
    }
    return true;
  };
}
