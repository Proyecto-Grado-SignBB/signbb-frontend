import { Routes } from '@angular/router';

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
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent)
  },
  { path: '**', redirectTo: 'subgrafos' }
];
