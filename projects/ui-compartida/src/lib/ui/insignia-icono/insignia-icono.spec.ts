import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsigniaIconoComponent } from './insignia-icono';

describe('InsigniaIcono', () => {
  let component: InsigniaIconoComponent;
  let fixture: ComponentFixture<InsigniaIconoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsigniaIconoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InsigniaIconoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
