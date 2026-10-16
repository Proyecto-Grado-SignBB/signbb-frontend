import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { interceptorSesion } from 'ui-compartida';

import { routes } from './app.routes';
import { proveerSesion } from './core/sesion/sesion';

/** Configuración de arranque de la app: router, HttpClient con el token de la sesión y la sesión. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([interceptorSesion])),
    ...proveerSesion()
  ]
};
