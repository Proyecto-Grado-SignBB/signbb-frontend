import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { ETIQUETA_DESENLACE, NodoLienzo } from '../../../models/lienzo.model';
import {
  ESCALA,
  MINIMAPA,
  areaVisible,
  centrarEn,
  escalaMinimapa,
  escalaParaAjustar,
  factorDeRueda,
  limitarEscala,
  noCabeEnLaVista,
  zoomEnPunto
} from '../../../core/grafo/vista';
import { MEDIDAS, distribuir } from '../lienzo/layout';

/**
 * Lienzo del editor de subgrafos en modo solo lectura. Reutiliza la misma
 * distribución, medidas y controles de zoom/mini-mapa, pero sin botones de
 * edición: los nodos y las ramas solo se observan.
 */
@Component({
  selector: 'app-visor-grafo',
  standalone: true,
  templateUrl: './visor-grafo.html',
  styleUrl: './visor-grafo.scss'
})
export class VisorGrafoComponent {
  /** Medidas del lienzo, para la plantilla. */
  protected readonly medidas = MEDIDAS;
  /** Texto legible de cada desenlace. */
  protected readonly etiquetaDesenlace = ETIQUETA_DESENLACE;

  private readonly inicioSig = signal<string | null>(null);
  private readonly nodosSig = signal<NodoLienzo[]>([]);

  /** Pregunta inicial del subgrafo. */
  @Input() set inicio(valor: string | null) {
    this.inicioSig.set(valor ?? null);
  }

  /** Nodos del subgrafo. */
  @Input() set nodos(valor: NodoLienzo[]) {
    this.nodosSig.set(valor ?? []);
  }

  /** Distribución calculada de nodos y ramas. */
  protected readonly distribucion = computed(() => distribuir(this.inicioSig(), this.nodosSig()));
  /** True si no hay nodos que dibujar. */
  protected readonly vacio = computed(() => this.distribucion().nodos.length === 0);

  protected readonly escala = signal(1);
  protected readonly porcentaje = computed(() => Math.round(this.escala() * 100));
  protected readonly puedeAcercar = computed(() => this.escala() < ESCALA.max - 0.001);
  protected readonly puedeAlejar = computed(() => this.escala() > ESCALA.min + 0.001);
  protected readonly arrastrando = signal(false);

  private readonly medidaVista = signal({ izquierda: 0, arriba: 0, ancho: 0, alto: 0 });
  private readonly zona = viewChild<ElementRef<HTMLElement>>('scroll');

  /** Mini-mapa: solo aparece si el lienzo no cabe en la ventana. */
  protected readonly minimapa = computed(() => {
    const d = this.distribucion();
    const v = this.medidaVista();
    const e = this.escala();
    if (v.ancho === 0 || !noCabeEnLaVista(d.ancho, d.alto, e, v.ancho, v.alto)) {
      return null;
    }
    const m = escalaMinimapa(d.ancho, d.alto, MINIMAPA.ancho, MINIMAPA.alto);
    return {
      escala: m,
      ancho: d.ancho * m,
      alto: d.alto * m,
      contenidoAncho: d.ancho,
      contenidoAlto: d.alto,
      area: areaVisible(v.izquierda, v.arriba, v.ancho, v.alto, e, d.ancho, d.alto)
    };
  });

  private arrastre: { x: number; y: number; izquierda: number; arriba: number; puntero: number } | null = null;
  private arrastrandoMinimapa = false;

  constructor(private cambios: ChangeDetectorRef) {
    effect(limpiar => {
      const el = this.zona()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(() => this.medirVista());
      observador.observe(el);
      this.medirVista();
      limpiar(() => observador.disconnect());
    });
  }

  /** True si el nodo es la primera pregunta. */
  protected esInicio(nodo: NodoLienzo): boolean {
    return nodo.id === this.inicioSig();
  }

  protected acercar(): void {
    this.cambiarEscala(this.escala() * ESCALA.paso);
  }

  protected alejar(): void {
    this.cambiarEscala(this.escala() / ESCALA.paso);
  }

  protected restablecer(): void {
    this.cambiarEscala(1);
  }

  /** Ajusta el zoom para ver todo el lienzo y vuelve al origen. */
  protected ajustar(): void {
    const el = this.zona()?.nativeElement;
    if (!el) {
      return;
    }
    const d = this.distribucion();
    this.cambiarEscala(escalaParaAjustar(d.ancho, d.alto, el.clientWidth, el.clientHeight));
    el.scrollTo({ left: 0, top: 0 });
    this.medirVista();
  }

  /** Ctrl + rueda hace zoom sobre el cursor; la rueda sola desplaza. */
  protected alRueda(evento: WheelEvent): void {
    if (!evento.ctrlKey && !evento.metaKey) {
      return;
    }
    const el = this.zona()?.nativeElement;
    if (!el) {
      return;
    }
    evento.preventDefault();
    const caja = el.getBoundingClientRect();
    this.cambiarEscala(
      this.escala() * factorDeRueda(evento.deltaY, evento.deltaMode),
      { x: evento.clientX - caja.left, y: evento.clientY - caja.top }
    );
  }

  protected alScroll(): void {
    this.medirVista();
  }

  private cambiarEscala(deseada: number, punto?: { x: number; y: number }): void {
    const el = this.zona()?.nativeElement;
    const antes = this.escala();
    const despues = limitarEscala(deseada);
    if (despues === antes) {
      return;
    }
    const origen = punto ?? { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
    const destino = el ? zoomEnPunto(antes, despues, el.scrollLeft, el.scrollTop, origen.x, origen.y) : null;
    this.escala.set(despues);
    if (el && destino) {
      this.cambios.detectChanges();
      el.scrollTo({ left: destino.izquierda, top: destino.arriba });
    }
    this.medirVista();
  }

  private medirVista(): void {
    const el = this.zona()?.nativeElement;
    if (!el) {
      return;
    }
    this.medidaVista.set({
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      ancho: el.clientWidth,
      alto: el.clientHeight
    });
  }

  /** Arrastrar el fondo mueve el lienzo. */
  protected alPulsar(evento: PointerEvent): void {
    if (evento.pointerType !== 'mouse' || evento.button !== 0) {
      return;
    }
    const el = this.zona()?.nativeElement;
    const objetivo = evento.target as HTMLElement | null;
    if (!el || !objetivo || objetivo.closest('.controles-zoom, .minimapa')) {
      return;
    }
    this.arrastre = {
      x: evento.clientX,
      y: evento.clientY,
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      puntero: evento.pointerId
    };
    el.setPointerCapture(evento.pointerId);
    this.arrastrando.set(true);
  }

  protected alMover(evento: PointerEvent): void {
    const a = this.arrastre;
    const el = this.zona()?.nativeElement;
    if (!a || !el || evento.pointerId !== a.puntero) {
      return;
    }
    el.scrollTo({ left: a.izquierda - (evento.clientX - a.x), top: a.arriba - (evento.clientY - a.y) });
  }

  protected alSoltar(): void {
    this.arrastre = null;
    this.arrastrando.set(false);
  }

  protected alPulsarMinimapa(evento: PointerEvent): void {
    if (evento.button !== 0) {
      return;
    }
    (evento.currentTarget as Element).setPointerCapture(evento.pointerId);
    this.arrastrandoMinimapa = true;
    this.irDesdeMinimapa(evento);
  }

  protected alMoverMinimapa(evento: PointerEvent): void {
    if (this.arrastrandoMinimapa) {
      this.irDesdeMinimapa(evento);
    }
  }

  protected alSoltarMinimapa(): void {
    this.arrastrandoMinimapa = false;
  }

  private irDesdeMinimapa(evento: PointerEvent): void {
    const m = this.minimapa();
    const el = this.zona()?.nativeElement;
    if (!m || !el) {
      return;
    }
    const caja = (evento.currentTarget as Element).getBoundingClientRect();
    const destino = centrarEn(
      (evento.clientX - caja.left) / m.escala,
      (evento.clientY - caja.top) / m.escala,
      this.escala(),
      el.clientWidth,
      el.clientHeight
    );
    el.scrollTo({ left: destino.izquierda, top: destino.arriba });
  }
}
