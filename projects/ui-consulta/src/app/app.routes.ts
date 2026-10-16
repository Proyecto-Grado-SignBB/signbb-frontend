import { Routes } from '@angular/router';
import { guardSesion } from 'ui-compartida';
import { Inicio } from './features/navegacion-grafo/inicio/inicio';
import { PreguntaComponent } from './features/navegacion-grafo/pregunta/pregunta';
import { ResultadoComponent } from './features/navegacion-grafo/resultado/resultado';
import { IngresoComponent } from './features/cuenta/ingreso/ingreso';
import { RegistroComponent } from './features/cuenta/registro/registro';
import { MisRecorridosComponent } from './features/mis-recorridos/mis-recorridos';

/**
 * Rutas de la app. El inicio, el ingreso y el registro son públicos; la
 * pregunta en curso, el resultado (los dos por el `recorridoId` de la sesión)
 * y «Mis recorridos» piden una cuenta de familia (`PADRE`). No hay ruta
 * comodín ni 404.
 */
export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'ingresar', component: IngresoComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'pregunta/:recorridoId', component: PreguntaComponent, canActivate: [guardSesion('PADRE')] },
  { path: 'resultado/:recorridoId', component: ResultadoComponent, canActivate: [guardSesion('PADRE')] },
  { path: 'mis-recorridos', component: MisRecorridosComponent, canActivate: [guardSesion('PADRE')] }
];
