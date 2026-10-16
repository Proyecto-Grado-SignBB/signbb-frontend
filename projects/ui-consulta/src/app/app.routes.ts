import { Routes } from '@angular/router';
import { guardSesion } from 'ui-compartida';
import { Inicio } from './features/navegacion-grafo/inicio/inicio';
import { PreguntaComponent } from './features/navegacion-grafo/pregunta/pregunta';
import { ResultadoComponent } from './features/navegacion-grafo/resultado/resultado';
import { IngresoComponent } from './features/cuenta/ingreso/ingreso';
import { RegistroComponent } from './features/cuenta/registro/registro';
import { MisRecorridosComponent } from './features/mis-recorridos/mis-recorridos';
import { BienvenidaComponent } from './features/cuenta/bienvenida/bienvenida';
import { PerfilComponent } from './features/cuenta/perfil/perfil';
import { guardFamilia } from './core/sesion/sesion';

/**
 * Rutas de la app. La bienvenida, el ingreso y el registro son públicos. El
 * inicio sin sesión lleva a la bienvenida; la pregunta en curso, el resultado
 * (los dos por el `recorridoId` de la sesión), «Mis recorridos» y el perfil
 * piden una cuenta de familia (`PADRE`). No hay ruta comodín ni 404.
 */
export const routes: Routes = [
  { path: '', component: Inicio, canActivate: [guardFamilia] },
  { path: 'bienvenida', component: BienvenidaComponent },
  { path: 'ingresar', component: IngresoComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'pregunta/:recorridoId', component: PreguntaComponent, canActivate: [guardSesion('PADRE')] },
  { path: 'resultado/:recorridoId', component: ResultadoComponent, canActivate: [guardSesion('PADRE')] },
  { path: 'mis-recorridos', component: MisRecorridosComponent, canActivate: [guardSesion('PADRE')] },
  { path: 'perfil', component: PerfilComponent, canActivate: [guardSesion('PADRE')] }
];
