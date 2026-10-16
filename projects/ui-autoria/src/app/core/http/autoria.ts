import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { UsuarioSesion } from 'ui-compartida';
import { environment } from '../../../environments/environment';
import {
  Aviso,
  Categoria,
  ErrorAutoriaDTO,
  NodoRequest,
  ResumenSubgrafoDTO,
  SubgrafoDTO,
  SubgrafoRequest
} from '../../models/lienzo.model';
import {
  BaseReglaDTO,
  BaseReglaRequest,
  CatalogoDTO,
  ReglaRequest,
  ResumenBaseReglaDTO
} from '../../models/regla.model';

/**
 * Cliente HTTP del módulo de autoría. Envuelve 1:1 los endpoints de
 * ControladorAutoria (rama `autoria` del backend). Cada operación que edita
 * el lienzo devuelve el borrador completo, así que la pantalla solo redibuja.
 */
@Injectable({ providedIn: 'root' })
export class AutoriaService {

  private readonly base = `${environment.apiUrl}/autoria`;

  constructor(private http: HttpClient) { }

  /** Cuenta de la sesión (`GET /auth/yo`), con los datos al día. */
  cuenta(): Observable<UsuarioSesion> {
    return this.http.get<UsuarioSesion>(`${environment.apiUrl}/auth/yo`);
  }

  /** Categorías: las preguntas puente del grafo raíz. */
  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.base}/categorias`);
  }

  // --- Tablero ---------------------------------------------------------------

  /** Lista los borradores del tablero, del último editado al primero. */
  listar(): Observable<ResumenSubgrafoDTO[]> {
    return this.http.get<ResumenSubgrafoDTO[]>(`${this.base}/subgrafos`);
  }

  /** Crea un borrador con el lienzo vacío. */
  crear(request: SubgrafoRequest): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos`, request);
  }

  /** Obtiene un borrador completo (lienzo y avisos). */
  obtener(id: number): Observable<SubgrafoDTO> {
    return this.http.get<SubgrafoDTO>(`${this.base}/subgrafos/${id}`);
  }

  /** Cambia los datos del subgrafo (nombre, categoría, nombre para la familia…). */
  actualizar(id: number, request: SubgrafoRequest): Observable<SubgrafoDTO> {
    return this.http.put<SubgrafoDTO>(`${this.base}/subgrafos/${id}`, request);
  }

  /** Borra un borrador que nunca se publicó. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/subgrafos/${id}`);
  }

  // --- Lienzo ----------------------------------------------------------------

  /** La acción del "+": crea el nodo y lo conecta a la respuesta de `despuesDe`. */
  agregarNodo(id: number, request: NodoRequest): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/nodos`, request);
  }

  /** Edita el texto, el desenlace o las respuestas de un nodo. */
  editarNodo(id: number, nodoId: string, request: NodoRequest): Observable<SubgrafoDTO> {
    return this.http.put<SubgrafoDTO>(`${this.base}/subgrafos/${id}/nodos/${nodoId}`, request);
  }

  /** Elimina un nodo y su rama; las respuestas que llegaban vuelven a ser un "+". */
  eliminarNodo(id: number, nodoId: string): Observable<SubgrafoDTO> {
    return this.http.delete<SubgrafoDTO>(`${this.base}/subgrafos/${id}/nodos/${nodoId}`);
  }

  /** "Pregunta existente"; con `nodoId` nulo la respuesta vuelve a ser un "+". */
  enlazar(id: number, respuestaId: string, nodoId: string | null): Observable<SubgrafoDTO> {
    return this.http.put<SubgrafoDTO>(
      `${this.base}/subgrafos/${id}/respuestas/${respuestaId}/destino`,
      { nodoId }
    );
  }

  /** Avisos actuales del lienzo. */
  avisos(id: number): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${this.base}/subgrafos/${id}/avisos`);
  }

  /**
   * Envía el subgrafo (y su base de reglas) a revisión: un supervisor lo
   * aprueba, y así se publica, o lo rechaza con un comentario. Si hay avisos
   * bloqueantes, responde 422 con ellos.
   */
  enviarRevision(id: number): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/enviar-revision`, {});
  }

  /** Retira el subgrafo de revisión para volver a editarlo. */
  retirarRevision(id: number): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/retirar-revision`, {});
  }

  // --- Reglas ----------------------------------------------------------------

  /** Lista las bases de reglas del tablero, del último editado al primero. */
  listarBases(): Observable<ResumenBaseReglaDTO[]> {
    return this.http.get<ResumenBaseReglaDTO[]>(`${this.base}/bases`);
  }

  /** Crea una base de reglas vacía para el grafo indicado. */
  crearBase(request: BaseReglaRequest): Observable<BaseReglaDTO> {
    return this.http.post<BaseReglaDTO>(`${this.base}/bases`, request);
  }

  /** Obtiene una base completa (reglas y avisos). */
  obtenerBase(id: number): Observable<BaseReglaDTO> {
    return this.http.get<BaseReglaDTO>(`${this.base}/bases/${id}`);
  }

  /** Cambia el nombre o la descripción de la base; el grafo no cambia. */
  actualizarBase(id: number, request: BaseReglaRequest): Observable<BaseReglaDTO> {
    return this.http.put<BaseReglaDTO>(`${this.base}/bases/${id}`, request);
  }

  /** Borra una base que nunca se publicó. */
  eliminarBase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/bases/${id}`);
  }

  /** Agrega una regla a la base. */
  agregarRegla(id: number, request: ReglaRequest): Observable<BaseReglaDTO> {
    return this.http.post<BaseReglaDTO>(`${this.base}/bases/${id}/reglas`, request);
  }

  /** Edita una regla de la base. */
  editarRegla(id: number, reglaId: string, request: ReglaRequest): Observable<BaseReglaDTO> {
    return this.http.put<BaseReglaDTO>(`${this.base}/bases/${id}/reglas/${reglaId}`, request);
  }

  /** Elimina una regla de la base. */
  eliminarRegla(id: number, reglaId: string): Observable<BaseReglaDTO> {
    return this.http.delete<BaseReglaDTO>(`${this.base}/bases/${id}/reglas/${reglaId}`);
  }

  /** Avisos actuales de la base de reglas. */
  avisosBase(id: number): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${this.base}/bases/${id}/avisos`);
  }

  /** Descarta los cambios sin publicar de una base: vuelve a su última publicación. */
  descartarBase(id: number): Observable<BaseReglaDTO> {
    return this.http.post<BaseReglaDTO>(`${this.base}/bases/${id}/descartar`, {});
  }

  /** Catálogo de nodos y respuestas de un grafo, para el editor de reglas. */
  catalogo(grafoId: string): Observable<CatalogoDTO> {
    return this.http.get<CatalogoDTO>(`${this.base}/bases/catalogo`, {
      params: { grafoId }
    });
  }

  /**
   * Sube una imagen de apoyo y devuelve el nombre con el que quedó guardada
   * (es lo que va en `imagenes` del nodo). Es independiente del subgrafo: la
   * imagen solo pasa a ser de una pregunta al guardarla en ella.
   */
  subirImagen(archivo: File): Observable<string> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<{ nombre: string }>(`${this.base}/imagenes`, datos).pipe(map(r => r.nombre));
  }

  /** Descarta los cambios sin publicar: el borrador vuelve a su última publicación. */
  descartar(id: number): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/descartar`, {});
  }

}

/**
 * Mensaje legible de un error de la API: el `mensaje` de los 422 de autoría
 * o un texto según el código HTTP.
 */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as Partial<ErrorAutoriaDTO> | null;
    if (cuerpo && typeof cuerpo.mensaje === 'string' && cuerpo.mensaje) {
      return cuerpo.mensaje;
    }
    if (error.status === 0) return 'No hay conexión con el servidor. Verifica que el backend esté disponible.';
    if (error.status === 400) return 'Algo en los datos no es válido. Revisa e intenta de nuevo.';
    if (error.status === 401) return 'Tu sesión terminó. Vuelve a ingresar.';
    if (error.status === 403) return 'No tienes permiso para hacer esto.';
    if (error.status === 404) return 'Ese elemento ya no existe. Recarga la página.';
    if (error.status === 409) return 'Alguien más editó este subgrafo al mismo tiempo. Recarga la página.';
    if (error.status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
  }
  return porDefecto;
}

/** Avisos que trae un 422 de autoría (por ejemplo, al publicar), o lista vacía. */
export function avisosDeError(error: unknown): Aviso[] {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as Partial<ErrorAutoriaDTO> | null;
    if (cuerpo && Array.isArray(cuerpo.avisos)) {
      return cuerpo.avisos;
    }
  }
  return [];
}
