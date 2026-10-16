import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { API_URL, CLAVE_SESION, SesionService } from './sesion';
import { interceptorSesion } from './interceptor-sesion';
import { sesionDePrueba } from './sesion.spec';

const API = 'http://api.prueba/api';
const CLAVE = 'prueba.interceptor';

describe('interceptorSesion', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sesion: SesionService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba()));
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/subgrafos/3' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorSesion])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
        { provide: CLAVE_SESION, useValue: CLAVE },
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem(CLAVE);
  });

  it('pone el Bearer en las peticiones a la API', () => {
    http.get(`${API}/autoria/subgrafos`).subscribe();
    const peticion = backend.expectOne(`${API}/autoria/subgrafos`);
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    peticion.flush([]);
  });

  it('no manda el token a otros hosts', () => {
    http.get('https://otro.host/api/algo').subscribe();
    http.get('http://api.prueba/apiotra/x').subscribe();
    expect(backend.expectOne('https://otro.host/api/algo').request.headers.has('Authorization')).toBeFalse();
    expect(backend.expectOne('http://api.prueba/apiotra/x').request.headers.has('Authorization')).toBeFalse();
  });

  it('sin sesión no pone cabecera', () => {
    sesion.salir();
    http.get(`${API}/autoria/categorias`).subscribe();
    expect(backend.expectOne(`${API}/autoria/categorias`).request.headers.has('Authorization')).toBeFalse();
  });

  it('un 401 cierra la sesión y lleva al ingreso con la ruta para volver', () => {
    let status = 0;
    http.get(`${API}/autoria/subgrafos`).subscribe({ error: e => (status = e.status) });
    backend.expectOne(`${API}/autoria/subgrafos`).flush({ mensaje: 'x' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(sesion.autenticado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/ingresar'], { queryParams: { volver: '/subgrafos/3' } });
  });

  it('un 401 del login no cierra nada ni redirige', () => {
    http.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/auth/login`).flush({ mensaje: 'x' }, { status: 401, statusText: 'Unauthorized' });

    expect(sesion.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 403 no cierra la sesión', () => {
    http.get(`${API}/usuarios`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/usuarios`).flush({ mensaje: 'x' }, { status: 403, statusText: 'Forbidden' });

    expect(sesion.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
