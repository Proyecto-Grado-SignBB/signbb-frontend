// TODO (fase de integración con backend real): reemplazar esta simulación por
// llamadas HTTP reales con HttpClient. La URL base debe salir siempre de
// `environment.apiUrl` (src/environments/environment.ts), nunca escribirse
// directamente aquí. Ejemplo de cómo se vería:
//   this.http.post<RecorridoResponse>(`${environment.apiUrl}/recorridos`, request)

import { Injectable } from '@angular/core';
import { Observable, of, throwError} from 'rxjs';
import { delay } from 'rxjs/operators';
import { RecorridoResponse, IniciarRecorridoRequest, ResponderRequest } from '../../models/recorrido.model';
import { Nodo } from '../../models/nodo.model';

interface EstadoInterno {
  nodoActualId: string | null;
  estado: 'EN_CURSO' | 'FINALIZADO';
  resultado: 'NORMAL' | 'REQUIERE_ATENCION' | null;
  mensaje: string | null;
}

const NODOS: Record<string, Nodo> = {
  p1: {
    id: 'p1',
    texto: '¿Tu bebé está respirando más rápido de lo usual?',
    opciones: [
      { texto: 'Sí', valor: 'si' },
      { texto: 'No', valor: 'no' }
    ]
  },
  p2: {
    id: 'p2',
    texto: '¿Cuál describe mejor a tu bebé ahora?',
    opciones: [
      { texto: 'Respiración más agitada de lo usual', valor: 'agitada' },
      { texto: 'Piel o labios con tono azulado', valor: 'cianosis' },
      { texto: 'Quejido leve al respirar', valor: 'quejido' },
      { texto: 'Pausas cortas al respirar (apnea)', valor: 'apnea' },
      { texto: 'Ninguna de las anteriores', valor: 'ninguna' }
    ]
  }
};

@Injectable({ providedIn: 'root' })
export class RecorridoService {

  // Simula la "base de datos" de recorridos en memoria mientras no hay backend real.
  private recorridos = new Map<string, EstadoInterno>();

  iniciar(request: IniciarRecorridoRequest): Observable<RecorridoResponse> {
    const recorridoId = crypto.randomUUID();
    this.recorridos.set(recorridoId, {
      nodoActualId: 'p1',
      estado: 'EN_CURSO',
      resultado: null,
      mensaje: null
    });
    return of(this.construirRespuesta(recorridoId)).pipe(delay(400));
  }

  responder(recorridoId: string, request: ResponderRequest): Observable<RecorridoResponse> {
    const estado = this.recorridos.get(recorridoId);
    if (!estado) {
      return throwError(() => new Error(`Recorrido no encontrado: ${recorridoId}`)).pipe(delay(300));
    }

    // NOTA: esta lógica de ramas es solo de ejemplo para probar las pantallas.
    // La lógica clínica real la definirá el Motor de Reglas en el backend.
    if (estado.nodoActualId === 'p1') {
      if (request.respuesta === 'no') {
        estado.nodoActualId = null;
        estado.estado = 'FINALIZADO';
        estado.resultado = 'NORMAL';
        estado.mensaje = 'No se detectan signos de alarma respiratoria en este momento.';
      } else {
        estado.nodoActualId = 'p2';
      }
    } else if (estado.nodoActualId === 'p2') {
      const graves = ['cianosis', 'apnea'];
      estado.nodoActualId = null;
      estado.estado = 'FINALIZADO';
      if (graves.includes(request.respuesta)) {
        estado.resultado = 'REQUIERE_ATENCION';
        estado.mensaje = 'Según lo que respondiste, es recomendable consultar a un profesional de salud para valorar a tu bebé.';
      } else {
        estado.resultado = 'NORMAL';
        estado.mensaje = 'No se detectan signos de alarma respiratoria en este momento.';
      }
    }

    return of(this.construirRespuesta(recorridoId)).pipe(delay(400));
  }

  consultar(recorridoId: string): Observable<RecorridoResponse> {
    if (!this.recorridos.has(recorridoId)) {
      return throwError(() => new Error(`Recorrido no encontrado: ${recorridoId}`)).pipe(delay(300));
    }
    return of(this.construirRespuesta(recorridoId)).pipe(delay(200));
  }

  private construirRespuesta(recorridoId: string): RecorridoResponse {
    const estado = this.recorridos.get(recorridoId)!;
    return {
      recorridoId,
      estado: estado.estado,
      nodoActual: estado.nodoActualId ? NODOS[estado.nodoActualId] : null,
      resultado: estado.resultado,
      mensaje: estado.mensaje
    };
  }
}