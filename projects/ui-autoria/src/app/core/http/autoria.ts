import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearGrafoRequest,
  DocumentoAutoria,
  DocumentoDTO,
  GrafoResumenDTO,
  MediaSubidaDTO,
  PreguntaRequest,
  PublicacionDTO,
  ReglaDTO,
  ReglaRequest,
  ResultadoEdicionDTO,
  ValidacionDTO
} from '../../models/autoria.model';

/**
 * Cliente HTTP del módulo de autoría. Envuelve 1:1 los endpoints reales de
 * ControladorAutoria (rama feature/modulo-autoria del backend).
 */
@Injectable({ providedIn: 'root' })
export class AutoriaService {

  private readonly base = `${environment.apiUrl}/autoria`;

  constructor(private http: HttpClient) { }

  // --- Pantalla 1: tablero -------------------------------------------------

  listar(): Observable<GrafoResumenDTO[]> {
    return this.http.get<GrafoResumenDTO[]>(`${this.base}/grafos`);
  }

  crear(request: CrearGrafoRequest): Observable<GrafoResumenDTO> {
    return this.http.post<GrafoResumenDTO>(`${this.base}/grafos`, request);
  }

  // --- Pantalla 2: documento del borrador ----------------------------------

  obtener(id: number): Observable<DocumentoDTO> {
    return this.http.get<DocumentoDTO>(`${this.base}/grafos/${id}`);
  }

  validar(id: number): Observable<ValidacionDTO> {
    return this.http.get<ValidacionDTO>(`${this.base}/grafos/${id}/validacion`);
  }

  guardar(id: number, documento: DocumentoAutoria): Observable<GrafoResumenDTO> {
    return this.http.post<GrafoResumenDTO>(`${this.base}/grafos/${id}/guardar`, { documento });
  }

  publicar(id: number): Observable<PublicacionDTO> {
    return this.http.post<PublicacionDTO>(`${this.base}/grafos/${id}/publicar`, {});
  }

  // --- Pantalla 3: preguntas ------------------------------------------------

  crearPregunta(id: number, request: PreguntaRequest): Observable<ResultadoEdicionDTO> {
    return this.http.post<ResultadoEdicionDTO>(`${this.base}/grafos/${id}/preguntas`, request);
  }

  editarPregunta(id: number, nodoId: string, request: PreguntaRequest): Observable<ResultadoEdicionDTO> {
    return this.http.put<ResultadoEdicionDTO>(
      `${this.base}/grafos/${id}/preguntas/${nodoId}`,
      request
    );
  }

  eliminarPregunta(id: number, nodoId: string): Observable<ResultadoEdicionDTO> {
    return this.http.delete<ResultadoEdicionDTO>(`${this.base}/grafos/${id}/preguntas/${nodoId}`);
  }

  /** Sube una imagen (multipart) y devuelve la URL pública para metadata.src. */
  subirMedia(archivo: File): Observable<MediaSubidaDTO> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<MediaSubidaDTO>(`${this.base}/media`, formData);
  }

  // --- Pantalla 4: reglas ----------------------------------------------------

  listarReglas(id: number): Observable<ReglaDTO[]> {
    return this.http.get<ReglaDTO[]>(`${this.base}/grafos/${id}/reglas`);
  }

  crearRegla(id: number, request: ReglaRequest): Observable<ResultadoEdicionDTO> {
    return this.http.post<ResultadoEdicionDTO>(`${this.base}/grafos/${id}/reglas`, request);
  }

  editarRegla(id: number, reglaId: string, request: ReglaRequest): Observable<ResultadoEdicionDTO> {
    return this.http.put<ResultadoEdicionDTO>(
      `${this.base}/grafos/${id}/reglas/${reglaId}`,
      request
    );
  }

  eliminarRegla(id: number, reglaId: string): Observable<ResultadoEdicionDTO> {
    return this.http.delete<ResultadoEdicionDTO>(`${this.base}/grafos/${id}/reglas/${reglaId}`);
  }
}
