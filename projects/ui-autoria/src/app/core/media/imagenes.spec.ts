import { environment } from '../../../environments/environment';
import { errorDeArchivo, MAX_BYTES_IMAGEN, urlImagen } from './imagenes';

describe('imagenes', () => {
  it('la imagen se pide a /media en la raíz del servidor, no bajo /api', () => {
    const url = urlImagen('abc.png');
    expect(url.endsWith('/media/abc.png')).toBeTrue();
    expect(url).not.toContain('/api/');
    expect(url.startsWith(environment.apiUrl.replace(/\/api\/?$/, ''))).toBeTrue();
  });

  it('acepta png, jpeg, webp y gif de hasta 1 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(errorDeArchivo({ type, size: MAX_BYTES_IMAGEN }, 0)).toBeNull();
    }
  });

  it('rechaza otros formatos', () => {
    expect(errorDeArchivo({ type: 'image/svg+xml', size: 100 }, 0)).toContain('png, jpeg, webp o gif');
    expect(errorDeArchivo({ type: 'application/pdf', size: 100 }, 0)).toContain('png, jpeg, webp o gif');
  });

  it('rechaza lo que pesa más de 1 MB y dice cuánto pesa', () => {
    const error = errorDeArchivo({ type: 'image/png', size: MAX_BYTES_IMAGEN + 1 }, 0);
    expect(error).toContain('1,0 MB');
    expect(error).toContain('máximo es 1 MB');
  });

  it('rechaza una cuarta imagen', () => {
    expect(errorDeArchivo({ type: 'image/png', size: 10 }, 2)).toBeNull();
    expect(errorDeArchivo({ type: 'image/png', size: 10 }, 3)).toContain('hasta 3');
  });
});
