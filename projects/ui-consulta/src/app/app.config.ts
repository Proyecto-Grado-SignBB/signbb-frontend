import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { interceptorSesion } from 'ui-compartida';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { proveerSesion } from './core/sesion/sesion';

/**
 * Configuración de arranque de la app: router, HttpClient con el token de la
 * sesión, la sesión de las familias y service worker (PWA, activo solo en
 * producción).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([interceptorSesion])),
    ...proveerSesion(),
    provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
