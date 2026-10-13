import { environment } from '../../../environments/environment';
import { urlImagen } from './imagenes';

describe('urlImagen', () => {
  const raiz = environment.apiUrl.replace(/\/api\/?$/, '');

  it('un nombre de archivo se pide a /media en la raíz del servidor', () => {
    expect(urlImagen('abc.png')).toBe(`${raiz}/media/abc.png`);
  });

  it('una ruta que ya empieza con /media se cuelga de la raíz del servidor', () => {
    expect(urlImagen('/media/ictericia-piel.jpg')).toBe(`${raiz}/media/ictericia-piel.jpg`);
  });

  it('una dirección completa se respeta', () => {
    expect(urlImagen('https://otro.example/foto.png')).toBe('https://otro.example/foto.png');
  });

  it('nunca queda bajo /api', () => {
    expect(urlImagen('abc.png')).not.toContain('/api/');
  });
});
