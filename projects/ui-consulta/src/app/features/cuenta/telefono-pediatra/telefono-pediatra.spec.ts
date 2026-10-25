import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CLAVE_SESION_CONSULTA, proveerSesion } from '../../../core/sesion/sesion';
import { MENSAJE_TELEFONO_INVALIDO, TelefonoPediatraComponent } from './telefono-pediatra';

const usuario = (telefonoPediatra: string | null) => ({
  id: 9, nombre: 'Papá Uno', correo: 'p1@signbb.local', rol: 'PADRE', institucion: null, activo: true, telefonoPediatra
});

describe('TelefonoPediatraComponent', () => {
  let fixture: ComponentFixture<TelefonoPediatraComponent>;
  let httpMock: HttpTestingController;

  function crear(telefono: string | null): HTMLElement {
    localStorage.setItem(CLAVE_SESION_CONSULTA, JSON.stringify({
      token: 't', expiraEn: new Date(Date.now() + 3_600_000).toISOString(), usuario: usuario(telefono)
    }));
    TestBed.configureTestingModule({
      imports: [TelefonoPediatraComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), ...proveerSesion()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TelefonoPediatraComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  async function escribirYGuardar(el: HTMLElement, valor: string): Promise<void> {
    await fixture.whenStable();
    const input = el.querySelector('input')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    el.querySelector('button')!.click();
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  it('arranca con el número guardado', async () => {
    const el = crear('3001234567');
    await fixture.whenStable();

    expect(el.querySelector('input')!.value).toBe('3001234567');
  });

  it('guarda el número y avisa con el valor guardado', async () => {
    const el = crear(null);
    const avisos: (string | null)[] = [];
    fixture.componentInstance.guardado.subscribe(t => avisos.push(t));

    await escribirYGuardar(el, ' 300 123 4567 ');
    const req = httpMock.expectOne(r => r.url.endsWith('/auth/yo/pediatra'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ telefono: '300 123 4567' });
    req.flush(usuario('300 123 4567'));
    fixture.detectChanges();

    expect(avisos).toEqual(['300 123 4567']);
    expect(el.querySelector('.telefono__listo')).not.toBeNull();
  });

  it('un número con letras no llega al back', async () => {
    const el = crear(null);

    await escribirYGuardar(el, 'llamar luego');

    httpMock.expectNone(r => r.url.endsWith('/auth/yo/pediatra'));
    expect(el.querySelector('.telefono__error')?.textContent).toContain(MENSAJE_TELEFONO_INVALIDO);
  });

  it('muestra el motivo del 422 del back', async () => {
    const el = crear(null);

    await escribirYGuardar(el, '3001234567');
    httpMock.expectOne(r => r.url.endsWith('/auth/yo/pediatra'))
      .flush({ mensaje: 'Teléfono no válido' }, { status: 422, statusText: 'Unprocessable Entity' });
    fixture.detectChanges();

    expect(el.querySelector('.telefono__error')?.textContent).toContain('Teléfono no válido');
  });
});
