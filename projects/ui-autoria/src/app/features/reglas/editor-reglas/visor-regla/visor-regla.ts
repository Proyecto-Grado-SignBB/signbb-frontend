import { Component, Input, computed, signal } from '@angular/core';
import { CatalogoDTO, Condicion } from '../../../../models/regla.model';
import { CasoVista, distribuirCasos } from './layout-regla';

/**
 * Visor embebido de una regla: dibuja cada caso como una cadena de preguntas
 * con la respuesta que debe estar marcada y la conclusión destino. Se alimenta
 * del formulario en vivo, así que refleja los cambios mientras se edita.
 */
@Component({
  selector: 'app-visor-regla',
  standalone: true,
  templateUrl: './visor-regla.html',
  styleUrl: './visor-regla.scss'
})
export class VisorReglaComponent {
  private readonly casosSig = signal<Condicion[][]>([]);
  private readonly destinoSig = signal('');
  private readonly catalogoSig = signal<CatalogoDTO | null>(null);

  /** Casos del formulario. */
  @Input() set casos(valor: Condicion[][]) {
    this.casosSig.set(valor ?? []);
  }

  /** Id del nodo destino del formulario. */
  @Input() set nodoDestino(valor: string) {
    this.destinoSig.set(valor ?? '');
  }

  /** Catálogo de nodos del grafo. */
  @Input() set catalogo(valor: CatalogoDTO | null) {
    this.catalogoSig.set(valor);
  }

  /** Vista de cada caso, recalculada cuando cambia el formulario. */
  protected readonly vistas = computed<CasoVista[]>(
    () => distribuirCasos(this.casosSig(), this.catalogoSig(), this.destinoSig()));
}
