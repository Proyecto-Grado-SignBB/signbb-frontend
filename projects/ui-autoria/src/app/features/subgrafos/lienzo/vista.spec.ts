import {
  ESCALA,
  areaVisible,
  centrarEn,
  escalaMinimapa,
  escalaParaAjustar,
  factorDeRueda,
  limitarEscala,
  noCabeEnLaVista,
  zoomEnPunto
} from './vista';

describe('vista del lienzo', () => {
  describe('limitarEscala', () => {
    it('deja pasar lo que está dentro de los límites', () => {
      expect(limitarEscala(1)).toBe(1);
      expect(limitarEscala(0.5)).toBe(0.5);
    });

    it('recorta por arriba y por abajo', () => {
      expect(limitarEscala(10)).toBe(ESCALA.max);
      expect(limitarEscala(0.01)).toBe(ESCALA.min);
    });

    it('un valor no válido vuelve a 100 %', () => {
      expect(limitarEscala(NaN)).toBe(1);
      expect(limitarEscala(Infinity)).toBe(1);
    });
  });

  describe('factorDeRueda', () => {
    it('girar hacia arriba acerca y hacia abajo aleja', () => {
      expect(factorDeRueda(-100, 0)).toBeGreaterThan(1);
      expect(factorDeRueda(100, 0)).toBeLessThan(1);
    });

    it('sin giro no cambia nada', () => {
      expect(factorDeRueda(0, 0)).toBe(1);
    });

    it('un golpe de ratón cambia la escala entre un 14 y un 16 %', () => {
      expect(factorDeRueda(-100, 0)).toBeCloseTo(1.16, 1);
    });

    it('las líneas y las páginas pesan más que los píxeles', () => {
      expect(factorDeRueda(-1, 1)).toBeCloseTo(factorDeRueda(-16, 0), 10);
      expect(factorDeRueda(-1, 2)).toBeCloseTo(factorDeRueda(-400, 0), 10);
    });
  });

  describe('escalaParaAjustar', () => {
    it('baja la escala hasta que el contenido cabe', () => {
      expect(escalaParaAjustar(2000, 1000, 1000, 800)).toBeCloseTo(0.5, 5);
      expect(escalaParaAjustar(1000, 2000, 800, 1000)).toBeCloseTo(0.5, 5);
    });

    it('no amplía por encima de 100 % un lienzo pequeño', () => {
      expect(escalaParaAjustar(300, 200, 1000, 800)).toBe(1);
    });

    it('no baja del mínimo aunque el lienzo sea enorme', () => {
      expect(escalaParaAjustar(100000, 100000, 1000, 800)).toBe(ESCALA.min);
    });

    it('con medidas vacías devuelve 100 %', () => {
      expect(escalaParaAjustar(0, 100, 1000, 800)).toBe(1);
      expect(escalaParaAjustar(100, 100, 0, 800)).toBe(1);
    });
  });

  describe('zoomEnPunto', () => {
    it('el punto del contenido bajo el cursor no se mueve al hacer zoom', () => {
      // Con escala 1, scroll (100, 50) y cursor en (200, 120) está el punto (300, 170) del contenido.
      const nuevo = zoomEnPunto(1, 2, 100, 50, 200, 120);

      // Con escala 2, ese punto queda en (600, 340) y debe seguir bajo el cursor.
      expect(nuevo.izquierda + 200).toBeCloseTo(600, 5);
      expect(nuevo.arriba + 120).toBeCloseTo(340, 5);
    });

    it('al alejar también se conserva el punto', () => {
      const nuevo = zoomEnPunto(1, 0.5, 400, 300, 100, 100);

      expect(nuevo.izquierda + 100).toBeCloseTo(250, 5);
      expect(nuevo.arriba + 100).toBeCloseTo(200, 5);
    });

    it('nunca devuelve un desplazamiento negativo', () => {
      const nuevo = zoomEnPunto(1, 0.25, 0, 0, 500, 400);

      expect(nuevo.izquierda).toBe(0);
      expect(nuevo.arriba).toBe(0);
    });
  });

  describe('centrarEn', () => {
    it('pone el punto en el centro de la vista', () => {
      const d = centrarEn(1000, 600, 1, 800, 400);

      expect(d.izquierda).toBe(600);
      expect(d.arriba).toBe(400);
    });

    it('tiene en cuenta la escala', () => {
      const d = centrarEn(1000, 600, 0.5, 800, 400);

      expect(d.izquierda).toBe(100);
      expect(d.arriba).toBe(100);
    });

    it('cerca del borde no se sale (queda en 0)', () => {
      const d = centrarEn(10, 10, 1, 800, 400);

      expect(d.izquierda).toBe(0);
      expect(d.arriba).toBe(0);
    });
  });

  describe('areaVisible', () => {
    it('es el recuadro de la vista dividido entre la escala', () => {
      const a = areaVisible(200, 100, 800, 400, 2, 3000, 2000);

      expect(a).toEqual({ x: 100, y: 50, ancho: 400, alto: 200 });
    });

    it('si el contenido cabe, el área es todo el contenido', () => {
      const a = areaVisible(0, 0, 1000, 800, 0.5, 600, 400);

      expect(a).toEqual({ x: 0, y: 0, ancho: 600, alto: 400 });
    });

    it('no se pasa del final del contenido', () => {
      const a = areaVisible(2800, 0, 800, 400, 1, 3000, 2000);

      expect(a.x).toBe(2800);
      expect(a.ancho).toBe(200);
    });
  });

  describe('noCabeEnLaVista', () => {
    it('detecta cuando hay que moverse', () => {
      expect(noCabeEnLaVista(2000, 500, 1, 1000, 800)).toBeTrue();
      expect(noCabeEnLaVista(500, 2000, 1, 1000, 800)).toBeTrue();
    });

    it('con zoom que lo hace caber ya no hace falta', () => {
      expect(noCabeEnLaVista(2000, 500, 0.5, 1000, 800)).toBeFalse();
    });

    it('acepta una diferencia de un píxel', () => {
      expect(noCabeEnLaVista(1001, 800, 1, 1000, 800)).toBeFalse();
    });
  });

  describe('escalaMinimapa', () => {
    it('hace caber el contenido en la caja sin deformarlo', () => {
      expect(escalaMinimapa(2000, 400, 200, 130)).toBeCloseTo(0.1, 5);
      expect(escalaMinimapa(400, 2000, 200, 130)).toBeCloseTo(0.065, 5);
    });

    it('con un contenido vacío devuelve 1', () => {
      expect(escalaMinimapa(0, 0, 200, 130)).toBe(1);
    });
  });
});
