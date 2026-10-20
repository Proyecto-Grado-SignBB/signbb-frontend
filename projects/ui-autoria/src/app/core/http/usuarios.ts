import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NuevoUsuarioRequest, UsuarioDTO } from '../../models/usuario.model';

/** Cliente HTTP de las cuentas clínicas (`/api/usuarios`, solo supervisor). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {

  private readonly base = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) { }

  /** Lista médicos y supervisores, por nombre. */
  listar(): Observable<UsuarioDTO[]> {
    return this.http.get<UsuarioDTO[]>(this.base);
  }

  /** Crea una cuenta clínica. */
  crear(request: NuevoUsuarioRequest): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.base, request);
  }

  /** Activa o desactiva una cuenta. */
  cambiarActivo(id: number, activo: boolean): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>(`${this.base}/${id}/activo`, { activo });
  }
}
