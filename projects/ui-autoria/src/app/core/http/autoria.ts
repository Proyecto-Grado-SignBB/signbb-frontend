import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
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

/**
 * Cliente HTTP del módulo de autoría. Envuelve 1:1 los endpoints de
 * ControladorAutoria (rama `autoria` del backend). Cada operación que edita
 * el lienzo devuelve el borrador completo, así que la pantalla solo redibuja.
 */
@Injectable({ providedIn: 'root' })
export class AutoriaService {

  private readonly base = `${environment.apiUrl}/autoria`;

  constructor(private http: HttpClient) { }

  /** Categorías: las preguntas puente del grafo raíz. */
  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.base}/categorias`);
  }

  // --- Tablero ---------------------------------------------------------------

  listar(): Observable<ResumenSubgrafoDTO[]> {
    return this.http.get<ResumenSubgrafoDTO[]>(`${this.base}/subgrafos`);
  }

  crear(request: SubgrafoRequest): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos`, request);
  }

  obtener(id: number): Observable<SubgrafoDTO> {
    return this.http.get<SubgrafoDTO>(`${this.base}/subgrafos/${id}`);
  }

  actualizar(id: number, request: SubgrafoRequest): Observable<SubgrafoDTO> {
    return this.http.put<SubgrafoDTO>(`${this.base}/subgrafos/${id}`, request);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/subgrafos/${id}`);
  }

  // --- Lienzo ----------------------------------------------------------------

  /** La acción del "+": crea el nodo y lo conecta a la respuesta de `despuesDe`. */
  agregarNodo(id: number, request: NodoRequest): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/nodos`, request);
  }

  editarNodo(id: number, nodoId: string, request: NodoRequest): Observable<SubgrafoDTO> {
    return this.http.put<SubgrafoDTO>(`${this.base}/subgrafos/${id}/nodos/${nodoId}`, request);
  }

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

  avisos(id: number): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${this.base}/subgrafos/${id}/avisos`);
  }

  publicar(id: number): Observable<SubgrafoDTO> {
    return this.http.post<SubgrafoDTO>(`${this.base}/subgrafos/${id}/publicar`, {});
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
