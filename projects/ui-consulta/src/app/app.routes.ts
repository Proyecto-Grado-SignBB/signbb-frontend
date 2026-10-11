import { Routes } from '@angular/router';
import { Inicio } from './features/navegacion-grafo/inicio/inicio';
import { PreguntaComponent } from './features/navegacion-grafo/pregunta/pregunta';
import { ResultadoComponent } from './features/navegacion-grafo/resultado/resultado';

/**
 * Rutas de la app: inicio, pregunta en curso y resultado, todas identificadas
 * por el `recorridoId` de la sesión. No hay ruta comodín ni 404.
 */
export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'pregunta/:recorridoId', component: PreguntaComponent },
  { path: 'resultado/:recorridoId', component: ResultadoComponent }
];