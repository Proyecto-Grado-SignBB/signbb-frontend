import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CLAVE_SESION_AUTORIA, proveerSesion } from '../../core/sesion/sesion';
import { UsuarioDTO } from '../../models/usuario.model';
import { PersonalComponent } from './personal';

const BASE = `${environment.apiUrl}/usuarios`;

const ANA: UsuarioDTO = {
  id: 7,
  nombre: 'Dra. Ana Martínez',
  correo: 'ana@signbb.local',
  rol: 'MEDICO',
  institucion: 'Fundación Canguro',
  activo: true
};

const SUPERVISOR: UsuarioDTO = {
  id: 99,
  nombre: 'Dr. Supervisor',
  correo: 'supervisor@signbb.local',
  rol: 'MEDICO_SUPERVISOR',
  institucion: 'SignBB',
  activo: true
};

describe('PersonalComponent', () => {
  let fixture: ComponentFixture<PersonalComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  function boton(texto: string, root: ParentNode = el): HTMLButtonElement {
    const encontrado = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find(b => b.textContent?.trim().includes(texto));
    if (!encontrado) throw new Error(`no hay un botón "${texto}"`);
    return encontrado;
  }

  async function escribir(name: string, valor: string): Promise<void> {
    const campo = el.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.setItem(CLAVE_SESION_AUTORIA, JSON.stringify({
      token: 'token-de-prueba',
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: 99, nombre: 'Dra. Camila Torres', correo: 'supervisor@signbb.local', rol: 'MEDICO_SUPERVISOR', institucion: 'SignBB', activo: true }
    }));
    await TestBed.configureTestingModule({
      imports: [PersonalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ...proveerSesion()
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PersonalComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(BASE).flush([ANA, SUPERVISOR]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('lista solo médicos y busca por nombre', async () => {
    expect(el.textContent).toContain('Dra. Ana Martínez');
    expect(el.textContent).not.toContain('Dr. Supervisor');

    const buscar = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    buscar.value = 'ana';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.textContent).toContain('1 de 1 médicos');
    expect(el.textContent).toContain('Dra. Ana Martínez');
  });

  it('crea un médico con rol MEDICO', async () => {
    boton('+ Agregar médico').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    await escribir('nombre', 'Dra. Valentina Herrera');
    await escribir('correo', 'valentina@signbb.local');
    await escribir('institucion', 'Fundación Canguro');
    await escribir('contrasena', 'signbb2026');
    boton('Crear médico').click();

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      nombre: 'Dra. Valentina Herrera',
      correo: 'valentina@signbb.local',
      contrasena: 'signbb2026',
      rol: 'MEDICO',
      institucion: 'Fundación Canguro'
    });
    peticion.flush({
      id: 8,
      nombre: 'Dra. Valentina Herrera',
      correo: 'valentina@signbb.local',
      rol: 'MEDICO',
      institucion: 'Fundación Canguro',
      activo: true
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Se agregó a Dra. Valentina Herrera.');
    expect(el.textContent).toContain('Dra. Valentina Herrera');
  });

  it('desactiva una cuenta después de confirmar', () => {
    boton('Desactivar').click();
    fixture.detectChanges();

    const dialogo = el.querySelector('app-dialogo-confirmar')!;
    expect(dialogo.textContent).toContain('¿Desactivar a Dra. Ana Martínez?');
    boton('Desactivar cuenta', dialogo).click();

    const peticion = http.expectOne(`${BASE}/7/activo`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ activo: false });
    peticion.flush({ ...ANA, activo: false });
    fixture.detectChanges();

    expect(el.textContent).toContain('Inactivo');
    expect(el.textContent).toContain('Dra. Ana Martínez quedó inactivo.');
  });
});
