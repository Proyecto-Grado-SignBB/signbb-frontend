import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecorridoResponse, ResponderRequest, ResumenRecorridoDTO } from '../../models/recorrido.model';
import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP del recorrido de triaje. Cada recorrido se identifica por su
 * `recorridoId` y queda a nombre de la cuenta que lo inició (el token lo pone
 * el interceptor de sesión); el de otra cuenta responde 404.
 */
@Injectable({ providedIn: 'root' })
export class RecorridoService {

  constructor(private http: HttpClient) { }

  /** Inicia un recorrido y devuelve la primera pregunta. */
  iniciar(): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(`${environment.apiUrl}/recorridos`, {});
  }

  /** Responde la pregunta actual (una opción o selección múltiple) y avanza. */
  responder(recorridoId: string, request: ResponderRequest): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(
      `${environment.apiUrl}/recorridos/${recorridoId}/respuestas`,
      request
    );
  }

  /** Deshace la última respuesta y devuelve la pregunta a la que se vuelve. */
  retroceder(recorridoId: string): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(
      `${environment.apiUrl}/recorridos/${recorridoId}/retroceder`,
      {}
    );
  }

  /** Consulta el estado del recorrido: pregunta actual o resultado final. */
  consultar(recorridoId: string): Observable<RecorridoResponse> {
    return this.http.get<RecorridoResponse>(`${environment.apiUrl}/recorridos/${recorridoId}`);
  }

  /** Recorridos de esta cuenta, del más nuevo al más viejo. */
  misRecorridos(): Observable<ResumenRecorridoDTO[]> {
    return this.http.get<ResumenRecorridoDTO[]>(`${environment.apiUrl}/recorridos`);
  }
}
