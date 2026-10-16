import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ResumenRecorridoDTO } from '../../models/recorrido.model';
import { MisRecorridosComponent } from './mis-recorridos';

describe('MisRecorridosComponent', () => {
  let fixture: ComponentFixture<MisRecorridosComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const recorridos: ResumenRecorridoDTO[] = [
    { recorridoId: 'r2', estado: 'EN_CURSO', nivel: null, mensaje: null,
      iniciadoEn: '2026-10-16T10:05:00Z', finalizadoEn: null },
    { recorridoId: 'r1', estado: 'FINALIZADO', nivel: 'URGENCIA', mensaje: 'Lleve al bebé a urgencias.',
      iniciadoEn: '2026-10-15T09:00:00Z', finalizadoEn: '2026-10-15T09:03:00Z' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MisRecorridosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisRecorridosComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const peticion = () => http.expectOne(`${environment.apiUrl}/recorridos`);

  it('lista los recorridos con «Continuar» y «Ver resultado»', () => {
    peticion().flush(recorridos);
    fixture.detectChanges();

    const filas = el.querySelectorAll('.mis__fila');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('En curso');
    expect(filas[0].querySelector('button')!.textContent).toContain('Continuar');
    expect(filas[1].textContent).toContain('Ir a urgencias');
    expect(filas[1].textContent).toContain('Lleve al bebé a urgencias.');
    expect(filas[1].querySelector('button')!.textContent).toContain('Ver resultado');
  });

  it('«Continuar» abre la pregunta y «Ver resultado» el resultado', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    peticion().flush(recorridos);
    fixture.detectChanges();

    const botones = el.querySelectorAll<HTMLButtonElement>('.mis__fila button');
    botones[0].click();
    botones[1].click();

    expect(navegar.calls.argsFor(0)[0]).toEqual(['/pregunta', 'r2']);
    expect(navegar.calls.argsFor(1)[0]).toEqual(['/resultado', 'r1']);
  });

  it('sin recorridos lo dice', () => {
    peticion().flush([]);
    fixture.detectChanges();

    expect(el.textContent).toContain('Todavía no has hecho ninguna consulta');
  });

  it('un error de carga se muestra y se puede reintentar', () => {
    peticion().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('No pudimos cargar tus consultas. Intenta de nuevo.');
  });
});
