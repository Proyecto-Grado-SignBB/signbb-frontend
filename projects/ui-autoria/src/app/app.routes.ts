import { Routes } from '@angular/router';
import { guardSesion } from 'ui-compartida';
import { ROLES_AUTORIA } from './core/sesion/sesion';

/** Solo médicos y supervisores; sin sesión lleva a `/ingresar`. */
const soloMedicos = guardSesion(...ROLES_AUTORIA);

/**
 * Rutas de la app: ingreso, tablero de subgrafos, lienzo de un subgrafo,
 * tablero de bases de reglas, editor de una base y perfil. Todas menos el
 * ingreso piden sesión de médico. Cada pantalla se carga de forma diferida;
 * cualquier ruta desconocida redirige al tablero de subgrafos.
 */
export const routes: Routes = [
  {
    path: 'ingresar',
    loadComponent: () => import('./features/ingreso/ingreso').then(m => m.IngresoComponent)
  },
  { path: '', redirectTo: 'subgrafos', pathMatch: 'full' },
  {
    path: 'subgrafos',
    canActivate: [soloMedicos],
    loadComponent: () => import('./features/subgrafos/tablero/tablero').then(m => m.TableroComponent)
  },
  {
    path: 'subgrafos/:id',
    canActivate: [soloMedicos],
    loadComponent: () => import('./features/subgrafos/lienzo/lienzo').then(m => m.LienzoComponent)
  },
  {
    path: 'reglas',
    canActivate: [soloMedicos],
    loadComponent: () => import('./features/reglas/tablero-reglas/tablero-reglas').then(m => m.TableroReglasComponent)
  },
  {
    path: 'reglas/:id',
    canActivate: [soloMedicos],
    loadComponent: () => import('./features/reglas/editor-reglas/editor-reglas').then(m => m.EditorReglasComponent)
  },
  {
    path: 'perfil',
    canActivate: [soloMedicos],
    loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent)
  },
  { path: '**', redirectTo: 'subgrafos' }
];
