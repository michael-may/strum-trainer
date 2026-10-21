import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatternEditor } from './pattern-editor';

describe('PatternEditor', () => {
  let component: PatternEditor;
  let fixture: ComponentFixture<PatternEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatternEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(PatternEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
