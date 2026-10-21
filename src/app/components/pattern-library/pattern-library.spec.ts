import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatternLibrary } from './pattern-library';

describe('PatternLibrary', () => {
  let component: PatternLibrary;
  let fixture: ComponentFixture<PatternLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatternLibrary],
    }).compileComponents();

    fixture = TestBed.createComponent(PatternLibrary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
