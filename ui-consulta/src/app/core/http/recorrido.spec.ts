import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RecorridoService } from './recorrido';
import { RecorridoResponse } from '../../models/recorrido.model';
import { environment } from '../../../environments/environment';

describe('RecorridoService', () => {
  let servicio: RecorridoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    servicio = TestBed.inject(RecorridoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('iniciar() debe hacer POST /recorridos y devolver RecorridoResponse en curso', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 1,
      estado: 'EN_CURSO',
      nodoActual: { id: 10, texto: '¿Tu bebé está respirando más rápido de lo usual?', opciones: [] },
      resultado: null,
      mensaje: null
    };

    let resultado!: RecorridoResponse;
    servicio.iniciar({ grafoClinicoId: 1 }).subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ grafoClinicoId: 1 });
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.recorridoId).toBe(1);
    expect(resultado.nodoActual?.id).toBe(10);
  });

  it('responder() debe hacer POST /recorridos/{id}/respuestas con el body correcto', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 1,
      estado: 'FINALIZADO',
      nodoActual: null,
      resultado: 'NORMAL',
      mensaje: 'No se detectan signos de alarma respiratoria en este momento.'
    };

    let resultado!: RecorridoResponse;
    servicio.responder(1, { respuesta: 'no' }).subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/1/respuestas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ respuesta: 'no' });
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('FINALIZADO');
    expect(resultado.resultado).toBe('NORMAL');
    expect(resultado.nodoActual).toBeNull();
  });

  it('consultar() debe hacer GET /recorridos/{id}', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 1,
      estado: 'EN_CURSO',
      nodoActual: { id: 10, texto: '¿Tu bebé está respirando más rápido de lo usual?', opciones: [] },
      resultado: null,
      mensaje: null
    };

    let resultado!: RecorridoResponse;
    servicio.consultar(1).subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/1`);
    expect(req.request.method).toBe('GET');
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.recorridoId).toBe(1);
  });

  it('responder con un id inexistente debe propagar el error HTTP', () => {
    let error: unknown;
    servicio.responder(999, { respuesta: 'si' }).subscribe({
      error: e => (error = e)
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/999/respuestas`);
    req.flush('Recorrido no encontrado', { status: 404, statusText: 'Not Found' });

    expect(error).toBeTruthy();
  });

  it('consultar con un id inexistente debe propagar el error HTTP', () => {
    let error: unknown;
    servicio.consultar(999).subscribe({
      error: e => (error = e)
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/999`);
    req.flush('Recorrido no encontrado', { status: 404, statusText: 'Not Found' });

    expect(error).toBeTruthy();
  });
});
