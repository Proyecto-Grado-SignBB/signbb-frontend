import { Provider } from '@angular/core';
import { API_URL, CLAVE_SESION, Rol } from 'ui-compartida';
import { environment } from '../../../environments/environment';

/** Clave de `localStorage` de la sesión de esta app (distinta de la de consulta). */
export const CLAVE_SESION_AUTORIA = 'signbb.autoria.sesion';

/** Roles que pueden usar la app de autoría. */
export const ROLES_AUTORIA: Rol[] = ['MEDICO', 'MEDICO_SUPERVISOR'];

/** Texto legible de cada rol. */
export const ETIQUETA_ROL: Record<Rol, string> = {
  PADRE: 'Padre o acudiente',
  MEDICO: 'Médico autor',
  MEDICO_SUPERVISOR: 'Médico supervisor'
};

/** Configuración de la sesión compartida para esta app; también la usan las specs. */
export function proveerSesion(): Provider[] {
  return [
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: CLAVE_SESION, useValue: CLAVE_SESION_AUTORIA }
  ];
}

/** Iniciales de un nombre (sin «Dr.» ni «Dra.»), para el avatar. */
export function iniciales(nombre: string): string {
  return nombre.replace(/^Dra?\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0])
    .join('')
    .toUpperCase();
}
