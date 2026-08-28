import { TestBed } from '@angular/core/testing';

import { Recorrido } from './recorrido';

describe('Recorrido', () => {
  let service: Recorrido;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recorrido);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
