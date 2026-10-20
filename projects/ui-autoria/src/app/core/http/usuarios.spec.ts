import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { UsuariosService } from './usuarios';

describe('UsuariosService', () => {
  const base = `${environment.apiUrl}/usuarios`;
  let servicio: UsuariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(UsuariosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista las cuentas clínicas', () => {
    servicio.listar().subscribe();
    expect(http.expectOne(base).request.method).toBe('GET');
  });

  it('crea una cuenta con los datos enviados', () => {
    const request = {
      nombre: 'Dra. Ana',
      correo: 'ana@signbb.local',
      contrasena: 'secreta12',
      rol: 'MEDICO' as const,
      institucion: 'Fundación Canguro'
    };
    servicio.crear(request).subscribe();
    const peticion = http.expectOne(base);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
  });

  it('activa y desactiva una cuenta', () => {
    servicio.cambiarActivo(7, false).subscribe();
    const desactivar = http.expectOne(`${base}/7/activo`);
    expect(desactivar.request.method).toBe('PUT');
    expect(desactivar.request.body).toEqual({ activo: false });

    servicio.cambiarActivo(7, true).subscribe();
    const activar = http.expectOne(`${base}/7/activo`);
    expect(activar.request.body).toEqual({ activo: true });
  });
});
