import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'grafos', pathMatch: 'full' },
  {
    path: 'grafos',
    loadComponent: () => import('./features/grafos/tablero/tablero').then(m => m.TableroComponent)
  },
  {
    path: 'grafos/:id',
    loadComponent: () => import('./features/grafos/flujo/flujo').then(m => m.FlujoComponent)
  },
  {
    path: 'grafos/:id/preguntas/nueva',
    loadComponent: () =>
      import('./features/grafos/pregunta-editor/pregunta-editor').then(m => m.PreguntaEditorComponent)
  },
  {
    path: 'grafos/:id/preguntas/:nodoId',
    loadComponent: () =>
      import('./features/grafos/pregunta-editor/pregunta-editor').then(m => m.PreguntaEditorComponent)
  },
  {
    path: 'grafos/:id/reglas',
    loadComponent: () => import('./features/grafos/reglas/reglas').then(m => m.ReglasComponent)
  }
];
