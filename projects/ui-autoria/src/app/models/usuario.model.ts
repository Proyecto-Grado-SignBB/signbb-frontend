import type { Rol } from 'ui-compartida';

/** Cuenta clínica tal como la devuelve `/api/usuarios`. */
export interface UsuarioDTO {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  institucion: string | null;
  activo: boolean;
}

/** Cuerpo de `POST /api/usuarios`; el alta de médicos siempre usa `MEDICO`. */
export interface NuevoUsuarioRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: 'MEDICO' | 'MEDICO_SUPERVISOR';
  institucion?: string;
}
