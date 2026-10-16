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

  it('iniciar() debe hacer POST /recorridos y devolver la primera pregunta', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 'abc-123',
      estado: 'EN_CURSO',
      pregunta: {
        id: 'pregunta_coloracion',
        texto: '¿Observa coloración amarilla en la piel o los ojos del bebé?',
        opciones: ['SI', 'NO'],
        tieneImagenes: true,
        imagenes: ['/images/ictericia-ejemplo.jpg']
      },
      resultado: null
    };

    let resultado!: RecorridoResponse;
    servicio.iniciar().subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos`);
    expect(req.request.method).toBe('POST');
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.recorridoId).toBe('abc-123');
    expect(resultado.pregunta?.id).toBe('pregunta_coloracion');
    expect(resultado.pregunta?.tieneImagenes).toBeTrue();
  });

  it('responder() debe hacer POST /recorridos/{id}/respuestas con el body correcto', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 'abc-123',
      estado: 'FINALIZADO',
      pregunta: null,
      resultado: {
        nivel: 'NORMAL',
        destinoId: 'recomendacion_tranquilidad',
        mensaje: 'La coloración amarilla puede ser normal en los primeros días.',
        razones: [],
        caminoCausal: []
      }
    };

    let resultado!: RecorridoResponse;
    servicio.responder('abc-123', { respuesta: 'NO' }).subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/abc-123/respuestas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ respuesta: 'NO' });
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('FINALIZADO');
    expect(resultado.resultado?.nivel).toBe('NORMAL');
    expect(resultado.pregunta).toBeNull();
  });

  it('responder() con 2+ reglas activas debe traer varias razones', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 'abc-123',
      estado: 'FINALIZADO',
      pregunta: null,
      resultado: {
        nivel: 'URGENCIA',
        destinoId: 'consulta_medica_urgente',
        mensaje: '¡ATENCIÓN! La ictericia puede ser grave.',
        razones: ['Ictericia prolongada', 'Ictericia con letargo'],
        caminoCausal: []
      }
    };

    let resultado!: RecorridoResponse;
    servicio.responder('abc-123', { respuesta: 'SI' }).subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/abc-123/respuestas`);
    req.flush(respuestaMock);

    expect(resultado.resultado?.razones.length).toBe(2);
    expect(resultado.resultado?.razones).toContain('Ictericia con letargo');
  });

  it('consultar() debe hacer GET /recorridos/{id}', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 'abc-123',
      estado: 'EN_CURSO',
      pregunta: {
        id: 'pregunta_coloracion',
        texto: '¿Observa coloración amarilla en la piel o los ojos del bebé?',
        opciones: ['SI', 'NO'],
        tieneImagenes: true,
        imagenes: []
      },
      resultado: null
    };

    let resultado!: RecorridoResponse;
    servicio.consultar('abc-123').subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.recorridoId).toBe('abc-123');
  });

  it('retroceder() debe hacer POST /recorridos/{id}/retroceder y devolver la pregunta anterior', () => {
    const respuestaMock: RecorridoResponse = {
      recorridoId: 'abc-123',
      estado: 'EN_CURSO',
      pregunta: {
        id: 'pregunta_anterior',
        texto: '¿Pregunta anterior?',
        opciones: ['SI', 'NO'],
        tieneImagenes: false,
        imagenes: []
      },
      resultado: null
    };

    let resultado!: RecorridoResponse;
    servicio.retroceder('abc-123').subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/abc-123/retroceder`);
    expect(req.request.method).toBe('POST');
    req.flush(respuestaMock);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.pregunta?.id).toBe('pregunta_anterior');
  });

  it('retroceder() sin respuestas previas debe propagar el error 400', () => {
    let error: { status?: number } | undefined;
    servicio.retroceder('abc-123').subscribe({ error: e => (error = e) });

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/abc-123/retroceder`);
    req.flush(null, { status: 400, statusText: 'Bad Request' });

    expect(error?.status).toBe(400);
  });

  it('responder con un id inexistente debe propagar el error HTTP', () => {
    let error: unknown;
    servicio.responder('no-existe', { respuesta: 'SI' }).subscribe({
      error: e => (error = e)
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/no-existe/respuestas`);
    req.flush('Recorrido no encontrado', { status: 404, statusText: 'Not Found' });

    expect(error).toBeTruthy();
  });

  it('consultar con un id inexistente debe propagar el error HTTP', () => {
    let error: unknown;
    servicio.consultar('no-existe').subscribe({
      error: e => (error = e)
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/recorridos/no-existe`);
    req.flush('Recorrido no encontrado', { status: 404, statusText: 'Not Found' });

    expect(error).toBeTruthy();
  });

  it('misRecorridos() hace GET /recorridos', () => {
    servicio.misRecorridos().subscribe(lista => expect(lista.length).toBe(1));
    const peticion = httpMock.expectOne(`${environment.apiUrl}/recorridos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([{
      recorridoId: 'abc-123', estado: 'FINALIZADO', nivel: 'URGENCIA', mensaje: 'Lleve al bebé a urgencias.',
      iniciadoEn: '2026-10-16T10:00:00Z', finalizadoEn: '2026-10-16T10:05:00Z'
    }]);
  });
});
