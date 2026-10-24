import { LINEA_EMERGENCIA, enlaceTelefono } from './emergencia';

describe('emergencia', () => {
  it('arma el enlace tel: de la línea 123', () => {
    expect(enlaceTelefono(LINEA_EMERGENCIA)).toBe('tel:123');
  });

  it('quita los espacios del número', () => {
    expect(enlaceTelefono('+57 300 123 4567')).toBe('tel:+573001234567');
  });
});
