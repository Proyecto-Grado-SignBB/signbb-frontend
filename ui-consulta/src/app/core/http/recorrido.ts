import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecorridoResponse, ResponderRequest } from '../../models/recorrido.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecorridoService {

  constructor(private http: HttpClient) { }

  iniciar(): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(`${environment.apiUrl}/recorridos`, {});
  }

  responder(recorridoId: string, request: ResponderRequest): Observable<RecorridoResponse> {
    return this.http.post<RecorridoResponse>(
      `${environment.apiUrl}/recorridos/${recorridoId}/respuestas`,
      request
    );
  }

  consultar(recorridoId: string): Observable<RecorridoResponse> {
    return this.http.get<RecorridoResponse>(`${environment.apiUrl}/recorridos/${recorridoId}`);
  }
}