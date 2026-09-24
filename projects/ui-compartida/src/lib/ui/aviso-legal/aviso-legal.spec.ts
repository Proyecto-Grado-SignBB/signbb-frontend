import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisoLegalComponent } from './aviso-legal';

describe('AvisoLegal', () => {
  let component: AvisoLegalComponent;
  let fixture: ComponentFixture<AvisoLegalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvisoLegalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvisoLegalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
