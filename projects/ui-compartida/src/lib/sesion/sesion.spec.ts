import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL, CLAVE_SESION, Sesion, SesionService } from './sesion';

const API = 'http://api.prueba/api';
const CLAVE = 'prueba.sesion';

/** Sesión de prueba que vence en `minutos` (negativo = ya venció). */
export function sesionDePrueba(rol: Sesion['usuario']['rol'] = 'MEDICO', minutos = 60): Sesion {
  return {
    token: 'token-de-prueba',
    expiraEn: new Date(Date.now() + minutos * 60_000).toISOString(),
    usuario: { id: 7, nombre: 'Dra. Ana', correo: 'a@signbb.local', rol, institucion: 'Fundación Canguro', activo: true }
  };
}

describe('SesionService', () => {
  let http: HttpTestingController;

  function crear(): SesionService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
        { provide: CLAVE_SESION, useValue: CLAVE }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SesionService);
  }

  beforeEach(() => localStorage.removeItem(CLAVE));
  afterEach(() => {
    http.verify();
    localStorage.removeItem(CLAVE);
  });

  it('ingresar guarda la sesión en localStorage', () => {
    const servicio = crear();
    const sesion = sesionDePrueba();
    servicio.ingresar('a@signbb.local', 'clave-larga').subscribe();

    const peticion = http.expectOne(`${API}/auth/login`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ correo: 'a@signbb.local', contrasena: 'clave-larga' });
    peticion.flush(sesion);

    expect(servicio.autenticado()).toBeTrue();
    expect(servicio.token()).toBe('token-de-prueba');
    expect(servicio.usuario()?.nombre).toBe('Dra. Ana');
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual(sesion);
  });

  it('registrar llama a /auth/registro y deja la sesión abierta', () => {
    const servicio = crear();
    servicio.registrar('Papá', 'p@signbb.local', 'clave-larga').subscribe();

    const peticion = http.expectOne(`${API}/auth/registro`);
    expect(peticion.request.body).toEqual({ nombre: 'Papá', correo: 'p@signbb.local', contrasena: 'clave-larga' });
    peticion.flush(sesionDePrueba('PADRE'));

    expect(servicio.tieneRol('PADRE')).toBeTrue();
  });

  it('un ingreso fallido no guarda nada', () => {
    const servicio = crear();
    servicio.ingresar('a@signbb.local', 'mala').subscribe({ error: () => undefined });
    http.expectOne(`${API}/auth/login`).flush({ mensaje: 'Correo o contraseña incorrectos.' },
      { status: 401, statusText: 'Unauthorized' });

    expect(servicio.autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('recupera la sesión guardada al arrancar', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba()));
    const servicio = crear();
    expect(servicio.vigente()).toBeTrue();
    expect(servicio.usuario()?.id).toBe(7);
  });

  it('descarta al arrancar una sesión vencida o dañada', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('MEDICO', -1)));
    expect(crear().autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE)).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem(CLAVE, '{no es json');
    expect(crear().autenticado()).toBeFalse();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('vigente cierra la sesión si venció mientras la app estaba abierta', () => {
    const servicio = crear();
    servicio.ingresar('a@signbb.local', 'clave-larga').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sesionDePrueba('MEDICO', -1));

    expect(servicio.vigente()).toBeFalse();
    expect(servicio.autenticado()).toBeFalse();
  });

  it('salir limpia la sesión', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba()));
    const servicio = crear();
    servicio.salir();
    expect(servicio.autenticado()).toBeFalse();
    expect(servicio.token()).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('tieneRol compara con el rol de la cuenta', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('MEDICO_SUPERVISOR')));
    const servicio = crear();
    expect(servicio.tieneRol('MEDICO', 'MEDICO_SUPERVISOR')).toBeTrue();
    expect(servicio.tieneRol('PADRE')).toBeFalse();
    servicio.salir();
    expect(servicio.tieneRol('MEDICO_SUPERVISOR')).toBeFalse();
  });
});
