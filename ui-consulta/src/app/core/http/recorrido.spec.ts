import { fakeAsync, tick } from '@angular/core/testing';
import { RecorridoService } from './recorrido';
import { RecorridoResponse } from '../../models/recorrido.model';

describe('RecorridoService', () => {
  let servicio: RecorridoService;

  beforeEach(() => {
    servicio = new RecorridoService();
  });

  it('iniciar() debe devolver el primer nodo (p1) en curso', fakeAsync(() => {
    let resultado!: RecorridoResponse;
    servicio.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe(r => (resultado = r));
    tick(400);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.nodoActual?.id).toBe('p1');
    expect(resultado.recorridoId).toBeTruthy();
  }));

  it('responder "no" en p1 debe finalizar con resultado NORMAL', fakeAsync(() => {
    let recorridoId = '';
    servicio.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe(r => (recorridoId = r.recorridoId));
    tick(400);

    let resultado!: RecorridoResponse;
    servicio.responder(recorridoId, { respuesta: 'no' }).subscribe(r => (resultado = r));
    tick(400);

    expect(resultado.estado).toBe('FINALIZADO');
    expect(resultado.resultado).toBe('NORMAL');
    expect(resultado.nodoActual).toBeNull();
  }));

  it('responder "si" en p1 debe avanzar a la pregunta p2', fakeAsync(() => {
    let recorridoId = '';
    servicio.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe(r => (recorridoId = r.recorridoId));
    tick(400);

    let resultado!: RecorridoResponse;
    servicio.responder(recorridoId, { respuesta: 'si' }).subscribe(r => (resultado = r));
    tick(400);

    expect(resultado.estado).toBe('EN_CURSO');
    expect(resultado.nodoActual?.id).toBe('p2');
  }));

  it('responder "cianosis" en p2 debe finalizar con REQUIERE_ATENCION', fakeAsync(() => {
    let recorridoId = '';
    servicio.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe(r => (recorridoId = r.recorridoId));
    tick(400);
    servicio.responder(recorridoId, { respuesta: 'si' }).subscribe();
    tick(400);

    let resultado!: RecorridoResponse;
    servicio.responder(recorridoId, { respuesta: 'cianosis' }).subscribe(r => (resultado = r));
    tick(400);

    expect(resultado.estado).toBe('FINALIZADO');
    expect(resultado.resultado).toBe('REQUIERE_ATENCION');
  }));

  it('responder "agitada" en p2 debe finalizar con NORMAL', fakeAsync(() => {
    let recorridoId = '';
    servicio.iniciar({ grafoClinicoId: 'grafo-dif-resp' }).subscribe(r => (recorridoId = r.recorridoId));
    tick(400);
    servicio.responder(recorridoId, { respuesta: 'si' }).subscribe();
    tick(400);

    let resultado!: RecorridoResponse;
    servicio.responder(recorridoId, { respuesta: 'agitada' }).subscribe(r => (resultado = r));
    tick(400);

    expect(resultado.resultado).toBe('NORMAL');
  }));

  it('responder con un id inexistente debe fallar', fakeAsync(() => {
    let error: unknown;
    servicio.responder('id-que-no-existe', { respuesta: 'si' }).subscribe({
      error: e => (error = e)
    });
    tick(300);

    expect(error).toBeTruthy();
  }));

  it('consultar con un id inexistente debe fallar', fakeAsync(() => {
    let error: unknown;
    servicio.consultar('id-que-no-existe').subscribe({
      error: e => (error = e)
    });
    tick(300);

    expect(error).toBeTruthy();
  }));
});