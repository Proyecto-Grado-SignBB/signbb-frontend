import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AutoriaService, avisosDeError, mensajeDeError } from './autoria';

describe('AutoriaService', () => {
  const base = `${environment.apiUrl}/autoria`;
  let servicio: AutoriaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(AutoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista y crea subgrafos', () => {
    servicio.listar().subscribe();
    expect(http.expectOne(`${base}/subgrafos`).request.method).toBe('GET');

    const request = { nombre: 'Fiebre', puenteId: 'puente_neuro', etiquetaOpcion: 'Fiebre o calentura' };
    servicio.crear(request).subscribe();
    const crear = http.expectOne(`${base}/subgrafos`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(request);
  });

  it('sube una imagen como multipart y devuelve su nombre', () => {
    const archivo = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
    let nombre: string | undefined;
    servicio.subirImagen(archivo).subscribe(n => (nombre = n));

    const peticion = http.expectOne(`${base}/imagenes`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body instanceof FormData).toBeTrue();
    expect((peticion.request.body as FormData).get('archivo')).toBeTruthy();
    peticion.flush({ nombre: '11111111-1111-1111-1111-111111111111.png' });

    expect(nombre).toBe('11111111-1111-1111-1111-111111111111.png');
  });

  it('el "+" manda la respuesta de la que cuelga el nodo nuevo', () => {
    const request = {
      despuesDe: { nodoId: 'pregunta_1', respuestaId: 'r_4' },
      tipo: 'CONCLUSION' as const,
      texto: 'Lleve al bebé a urgencias ahora.',
      desenlace: 'URGENCIA' as const
    };
    servicio.agregarNodo(7, request).subscribe();
    const req = http.expectOne(`${base}/subgrafos/7/nodos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
  });

  it('editar y eliminar un nodo van a su ruta', () => {
    servicio.editarNodo(7, 'pregunta_1', { texto: 'x' }).subscribe();
    expect(http.expectOne(`${base}/subgrafos/7/nodos/pregunta_1`).request.method).toBe('PUT');
    servicio.eliminarNodo(7, 'pregunta_1').subscribe();
    expect(http.expectOne(`${base}/subgrafos/7/nodos/pregunta_1`).request.method).toBe('DELETE');
  });

  it('enlazar manda el nodo destino, o null para volver al "+"', () => {
    servicio.enlazar(7, 'r_2', 'pregunta_6').subscribe();
    const a = http.expectOne(`${base}/subgrafos/7/respuestas/r_2/destino`);
    expect(a.request.method).toBe('PUT');
    expect(a.request.body).toEqual({ nodoId: 'pregunta_6' });

    servicio.enlazar(7, 'r_2', null).subscribe();
    expect(http.expectOne(`${base}/subgrafos/7/respuestas/r_2/destino`).request.body).toEqual({ nodoId: null });
  });

  it('descartar cambios hace POST a /descartar y devuelve el borrador', () => {
    servicio.descartar(7).subscribe();
    const peticion = http.expectOne(`${base}/subgrafos/7/descartar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({});
  });

  it('publicar, avisos y categorías', () => {
    servicio.publicar(7).subscribe();
    expect(http.expectOne(`${base}/subgrafos/7/publicar`).request.method).toBe('POST');
    servicio.avisos(7).subscribe();
    expect(http.expectOne(`${base}/subgrafos/7/avisos`).request.method).toBe('GET');
    servicio.categorias().subscribe();
    expect(http.expectOne(`${base}/categorias`).request.method).toBe('GET');
  });

  it('lista y crea bases de reglas', () => {
    servicio.listarBases().subscribe();
    expect(http.expectOne(`${base}/bases`).request.method).toBe('GET');

    const request = { nombre: 'Reglas de fiebre', descripcion: 'x', grafoId: 'grafo_fiebre' };
    servicio.crearBase(request).subscribe();
    const crear = http.expectOne(`${base}/bases`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(request);
  });

  it('agrega, edita y elimina reglas de una base', () => {
    const regla = { nombre: 'R', casos: [[{ idNodo: 'pregunta_1', respuesta: 'SI' }]], nivel: 'URGENCIA' as const, nodoDestino: 'conclusion_1' };
    servicio.agregarRegla(3, regla).subscribe();
    const crear = http.expectOne(`${base}/bases/3/reglas`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(regla);

    servicio.editarRegla(3, 'R_1', regla).subscribe();
    expect(http.expectOne(`${base}/bases/3/reglas/R_1`).request.method).toBe('PUT');

    servicio.eliminarRegla(3, 'R_1').subscribe();
    expect(http.expectOne(`${base}/bases/3/reglas/R_1`).request.method).toBe('DELETE');
  });

  it('publicar base, avisos y catálogo', () => {
    servicio.publicarBase(3).subscribe();
    expect(http.expectOne(`${base}/bases/3/publicar`).request.method).toBe('POST');
    servicio.avisosBase(3).subscribe();
    expect(http.expectOne(`${base}/bases/3/avisos`).request.method).toBe('GET');
    servicio.catalogo('grafo_fiebre').subscribe();
    const cat = http.expectOne(`${base}/bases/catalogo?grafoId=grafo_fiebre`);
    expect(cat.request.method).toBe('GET');
  });

  it('descartar cambios de una base hace POST a /bases/{id}/descartar', () => {
    servicio.descartarBase(3).subscribe();
    const peticion = http.expectOne(`${base}/bases/3/descartar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({});
  });
});

describe('errores de autoría', () => {
  const aviso = {
    codigo: 'RESPUESTA_SIN_CAMINO' as const,
    bloqueante: true,
    mensaje: 'La respuesta "No" todavía no dice qué pasa después.',
    nodoId: 'pregunta_6',
    respuestaId: 'r_8'
  };

  it('usa el mensaje y los avisos del 422', () => {
    const e = new HttpErrorResponse({ status: 422, error: { mensaje: 'Antes de publicar hay que resolver los avisos.', avisos: [aviso] } });
    expect(mensajeDeError(e, 'x')).toBe('Antes de publicar hay que resolver los avisos.');
    expect(avisosDeError(e)).toEqual([aviso]);
  });

  it('sin cuerpo explica el código HTTP', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 409 }), 'x')).toContain('al mismo tiempo');
    expect(mensajeDeError(new HttpErrorResponse({ status: 404 }), 'x')).toContain('ya no existe');
    expect(mensajeDeError(new HttpErrorResponse({ status: 400 }), 'x')).toContain('no es válido');
    expect(mensajeDeError(new HttpErrorResponse({ status: 503 }), 'x')).toContain('El servidor tuvo un problema');
    expect(mensajeDeError(new HttpErrorResponse({ status: 0 }), 'x')).toContain('No hay conexión');
    expect(mensajeDeError(new Error('otro'), 'por defecto')).toBe('por defecto');
    expect(avisosDeError(new HttpErrorResponse({ status: 500 }))).toEqual([]);
  });
});
