import { Routes } from '@angular/router';

/**
 * Rutas de la app: tablero de subgrafos, lienzo de un subgrafo, tablero de
 * bases de reglas, editor de una base y perfil. Cada pantalla se carga de forma
 * diferida; cualquier ruta desconocida redirige al tablero de subgrafos.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'subgrafos', pathMatch: 'full' },
  {
    path: 'subgrafos',
    loadComponent: () => import('./features/subgrafos/tablero/tablero').then(m => m.TableroComponent)
  },
  {
    path: 'subgrafos/:id',
    loadComponent: () => import('./features/subgrafos/lienzo/lienzo').then(m => m.LienzoComponent)
  },
  {
    path: 'reglas',
    loadComponent: () => import('./features/reglas/tablero-reglas/tablero-reglas').then(m => m.TableroReglasComponent)
  },
  {
    path: 'reglas/:id',
    loadComponent: () => import('./features/reglas/editor-reglas/editor-reglas').then(m => m.EditorReglasComponent)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent)
  },
  { path: '**', redirectTo: 'subgrafos' }
];
