import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { LienzoComponent } from './lienzo';

const BASE = `${environment.apiUrl}/autoria`;

describe('LienzoComponent: dirección con un subgrafo que no existe', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LienzoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'subgrafos/:id', component: LienzoComponent }])
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function abrir(id: string): Promise<HTMLElement> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/subgrafos/${id}`, LienzoComponent);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  for (const id of ['abc', '0', '-3', '1.5']) {
    it(`con la dirección "${id}" lo explica sin molestar al servidor`, async () => {
      const el = await abrir(id);

      http.expectNone(r => r.url.startsWith(`${BASE}/subgrafos`));
      expect(el.textContent).toContain('Ese subgrafo no existe.');
      expect(el.textContent).not.toContain('Cargando el lienzo');
    });
  }

  it('con un número que el servidor no tiene muestra el aviso de que ya no existe', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/subgrafos/99999', LienzoComponent);
    http.expectOne(`${BASE}/subgrafos/99999`).flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Ese elemento ya no existe.');
  });
});
