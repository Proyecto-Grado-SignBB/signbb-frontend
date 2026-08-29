import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecorridoResponse, IniciarRecorridoRequest, ResponderRequest } from '../../models/recorrido.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecorridoService {

  constructor(private http: HttpClient) {}

  iniciar(request: IniciarRecorridoRequest): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(`${environment.apiUrl}/recorridos`, request);
  }

  responder(recorridoId: number, request: ResponderRequest): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(
      `${environment.apiUrl}/recorridos/${recorridoId}/respuestas`,
      request
    );
  }

  consultar(recorridoId: number): Observable<RecorridoResponse> {
    return this.http.get<RecorridoResponse>(`${environment.apiUrl}/recorridos/${recorridoId}`);
  }
}
