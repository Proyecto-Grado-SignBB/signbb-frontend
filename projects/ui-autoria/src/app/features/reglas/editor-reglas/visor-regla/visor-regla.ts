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
import { NgTemplateOutlet } from '@angular/common';
import { CatalogoDTO, Condicion } from '../../../../models/regla.model';
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
} from '../../../../core/grafo/vista';
import { CasoVista, MEDIDAS_REGLA, distribuirCasos } from './layout-regla';

/**
 * Visor embebido de una regla: dibuja cada caso como una cadena de preguntas
 * con la respuesta que debe estar marcada y la conclusión destino. Se alimenta
 * del formulario en vivo y cada caso se escala para caber en el ancho
 * disponible (centrado). El botón «Expandir» abre un caso en una ventana con
 * zoom, desplazamiento y mini-mapa, como el visor del grafo.
 */
@Component({
  selector: 'app-visor-regla',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './visor-regla.html',
  styleUrl: './visor-regla.scss'
})
export class VisorReglaComponent {
  /** Medidas del visor, expuestas a la plantilla. */
  protected readonly medidas = MEDIDAS_REGLA;
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

  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  /** Ancho disponible dentro del recuadro con scroll del visor embebido. */
  protected readonly anchoDisponible = signal(0);

  constructor(private cambios: ChangeDetectorRef) {
    // Mide el ancho disponible cuando el visor aparece o cambia de tamaño.
    effect(limpiar => {
      this.vistas();
      const host = this.host.nativeElement;
      const medir = () => {
        const el = host.querySelector<HTMLElement>('.grafo-scroll');
        this.anchoDisponible.set(el?.clientWidth ?? 0);
      };
      queueMicrotask(medir);
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(medir);
      observador.observe(host);
      limpiar(() => observador.disconnect());
    });

    // Mide la zona de la ventana ampliada cuando se abre.
    effect(limpiar => {
      const el = this.zonaExp()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(() => this.medirVistaExp());
      observador.observe(el);
      this.medirVistaExp();
      limpiar(() => observador.disconnect());
    });
  }

  /** Escala para que un caso quepa en el ancho disponible (nunca agranda). */
  protected escalaInline(ancho: number): number {
    const disponible = this.anchoDisponible();
    return disponible > 0 && ancho > 0 ? Math.min(1, disponible / ancho) : 1;
  }

  // --- Ventana ampliada: un caso, con zoom, movimiento y mini-mapa --------------

  /** True si la ventana ampliada está abierta. */
  protected readonly expandido = signal(false);
  /** Índice del caso que se muestra en la ventana ampliada. */
  protected readonly casoExpandido = signal(0);
  /** Caso que se está mostrando en grande. */
  protected readonly vistaExpandida = computed<CasoVista | null>(
    () => this.vistas()[this.casoExpandido()] ?? null);

  protected readonly escalaExp = signal(1);
  protected readonly porcentajeExp = computed(() => Math.round(this.escalaExp() * 100));
  protected readonly puedeAcercarExp = computed(() => this.escalaExp() < ESCALA.max - 0.001);
  protected readonly puedeAlejarExp = computed(() => this.escalaExp() > ESCALA.min + 0.001);
  protected readonly arrastrandoExp = signal(false);

  private readonly medidaVistaExp = signal({ izquierda: 0, arriba: 0, ancho: 0, alto: 0 });
  private readonly zonaExp = viewChild<ElementRef<HTMLElement>>('scrollExp');

  /** Mini-mapa: solo aparece si el caso, con el zoom actual, no cabe en la ventana. */
  protected readonly minimapaExp = computed(() => {
    const d = this.vistaExpandida();
    const v = this.medidaVistaExp();
    const e = this.escalaExp();
    if (!d || v.ancho === 0 || !noCabeEnLaVista(d.ancho, d.alto, e, v.ancho, v.alto)) {
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

  private arrastreExp: { x: number; y: number; izquierda: number; arriba: number; puntero: number } | null = null;
  private arrastrandoMinimapaExp = false;

  /** Abre el caso en la ventana ampliada y lo ajusta a la vista. */
  protected abrirExpandido(indice: number): void {
    if (this.vistas()[indice]?.vacio !== false) {
      return;
    }
    this.casoExpandido.set(indice);
    this.escalaExp.set(1);
    this.expandido.set(true);
    setTimeout(() => this.ajustarExp());
  }

  /** Cierra la ventana ampliada. */
  protected cerrarExpandido(): void {
    this.expandido.set(false);
    this.arrastrandoExp.set(false);
  }

  /** Cambia el caso que se ve en grande. */
  protected irCaso(indice: number): void {
    if (this.vistas()[indice]?.vacio !== false) {
      return;
    }
    this.casoExpandido.set(indice);
    this.escalaExp.set(1);
    setTimeout(() => this.ajustarExp());
  }

  protected acercarExp(): void {
    this.cambiarEscalaExp(this.escalaExp() * ESCALA.paso);
  }

  protected alejarExp(): void {
    this.cambiarEscalaExp(this.escalaExp() / ESCALA.paso);
  }

  protected restablecerExp(): void {
    this.cambiarEscalaExp(1);
  }

  /** Ajusta el zoom para ver todo el caso y vuelve a su esquina superior izquierda. */
  protected ajustarExp(): void {
    const el = this.zonaExp()?.nativeElement;
    const d = this.vistaExpandida();
    if (!el || !d) {
      return;
    }
    this.cambiarEscalaExp(escalaParaAjustar(d.ancho, d.alto, el.clientWidth, el.clientHeight));
    el.scrollTo({ left: 0, top: 0 });
    this.medirVistaExp();
  }

  /** Ctrl + rueda (o pellizco del trackpad) hace zoom sobre el cursor. */
  protected alRuedaExp(evento: WheelEvent): void {
    if (!evento.ctrlKey && !evento.metaKey) {
      return;
    }
    const el = this.zonaExp()?.nativeElement;
    if (!el) {
      return;
    }
    evento.preventDefault();
    const caja = el.getBoundingClientRect();
    this.cambiarEscalaExp(this.escalaExp() * factorDeRueda(evento.deltaY, evento.deltaMode), {
      x: evento.clientX - caja.left,
      y: evento.clientY - caja.top
    });
  }

  protected alScrollExp(): void {
    this.medirVistaExp();
  }

  private cambiarEscalaExp(deseada: number, punto?: { x: number; y: number }): void {
    const el = this.zonaExp()?.nativeElement;
    const antes = this.escalaExp();
    const despues = limitarEscala(deseada);
    if (despues === antes) {
      return;
    }
    const origen = punto ?? { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
    const destino = el ? zoomEnPunto(antes, despues, el.scrollLeft, el.scrollTop, origen.x, origen.y) : null;
    this.escalaExp.set(despues);
    if (el && destino) {
      this.cambios.detectChanges();
      el.scrollTo({ left: destino.izquierda, top: destino.arriba });
    }
    this.medirVistaExp();
  }

  private medirVistaExp(): void {
    const el = this.zonaExp()?.nativeElement;
    if (!el) {
      return;
    }
    this.medidaVistaExp.set({
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      ancho: el.clientWidth,
      alto: el.clientHeight
    });
  }

  /** Arrastrar el fondo con el ratón mueve la vista (sobre una tarjeta no). */
  protected alPulsarExp(evento: PointerEvent): void {
    if (evento.pointerType !== 'mouse' || evento.button !== 0) {
      return;
    }
    const el = this.zonaExp()?.nativeElement;
    const objetivo = evento.target as HTMLElement | null;
    if (!el || objetivo?.closest('button')) {
      return;
    }
    if (objetivo === el && (evento.offsetX >= el.clientWidth || evento.offsetY >= el.clientHeight)) {
      return;
    }
    this.arrastreExp = {
      x: evento.clientX,
      y: evento.clientY,
      izquierda: el.scrollLeft,
      arriba: el.scrollTop,
      puntero: evento.pointerId
    };
    el.setPointerCapture(evento.pointerId);
    this.arrastrandoExp.set(true);
  }

  protected alMoverExp(evento: PointerEvent): void {
    const a = this.arrastreExp;
    const el = this.zonaExp()?.nativeElement;
    if (!a || !el || evento.pointerId !== a.puntero) {
      return;
    }
    el.scrollTo({ left: a.izquierda - (evento.clientX - a.x), top: a.arriba - (evento.clientY - a.y) });
  }

  protected alSoltarExp(): void {
    this.arrastreExp = null;
    this.arrastrandoExp.set(false);
  }

  /** Tocar o arrastrar sobre el mini-mapa lleva la vista a esa zona. */
  protected alPulsarMinimapaExp(evento: PointerEvent): void {
    if (evento.button !== 0) {
      return;
    }
    (evento.currentTarget as Element).setPointerCapture(evento.pointerId);
    this.arrastrandoMinimapaExp = true;
    this.irDesdeMinimapaExp(evento);
  }

  protected alMoverMinimapaExp(evento: PointerEvent): void {
    if (this.arrastrandoMinimapaExp) {
      this.irDesdeMinimapaExp(evento);
    }
  }

  protected alSoltarMinimapaExp(): void {
    this.arrastrandoMinimapaExp = false;
  }

  private irDesdeMinimapaExp(evento: PointerEvent): void {
    const m = this.minimapaExp();
    const el = this.zonaExp()?.nativeElement;
    if (!m || !el) {
      return;
    }
    const caja = (evento.currentTarget as Element).getBoundingClientRect();
    const destino = centrarEn(
      (evento.clientX - caja.left) / m.escala,
      (evento.clientY - caja.top) / m.escala,
      this.escalaExp(),
      el.clientWidth,
      el.clientHeight
    );
    el.scrollTo({ left: destino.izquierda, top: destino.arriba });
  }
}
