import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { API_URL, CLAVE_SESION } from './sesion';
import { guardSesion } from './guard-sesion';
import { sesionDePrueba } from './sesion.spec';

const CLAVE = 'prueba.guard';

describe('guardSesion', () => {
  function ejecutar(...roles: Parameters<typeof guardSesion>): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: API_URL, useValue: 'http://api.prueba/api' },
        { provide: CLAVE_SESION, useValue: CLAVE }
      ]
    });
    const estado = { url: '/subgrafos/3' } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(
      () => guardSesion(...roles)({} as ActivatedRouteSnapshot, estado)) as boolean | UrlTree;
  }

  function url(resultado: boolean | UrlTree): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  afterEach(() => localStorage.removeItem(CLAVE));

  it('sin sesión lleva al ingreso con la ruta para volver', () => {
    expect(url(ejecutar('MEDICO'))).toBe('/ingresar?volver=%2Fsubgrafos%2F3');
  });

  it('con una sesión vencida también lleva al ingreso', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('MEDICO', -1)));
    expect(url(ejecutar('MEDICO'))).toBe('/ingresar?volver=%2Fsubgrafos%2F3');
  });

  it('con otro rol lleva al ingreso con motivo=rol', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('PADRE')));
    expect(url(ejecutar('MEDICO', 'MEDICO_SUPERVISOR'))).toBe('/ingresar?motivo=rol');
  });

  it('con el rol correcto deja pasar', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('MEDICO_SUPERVISOR')));
    expect(ejecutar('MEDICO', 'MEDICO_SUPERVISOR')).toBeTrue();
  });

  it('sin roles basta con tener sesión', () => {
    localStorage.setItem(CLAVE, JSON.stringify(sesionDePrueba('PADRE')));
    expect(ejecutar()).toBeTrue();
  });
});
