import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { StrumEngine } from './core/strum-engine';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the title, visualizer and a step per eighth note', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Strum Trainer');
    expect(el.querySelectorAll('app-visualizer .step')).toHaveLength(8);
    expect(el.querySelectorAll('app-pattern-editor .step')).toHaveLength(8);
  });

  it('toggles a strum from the editor and updates the visualizer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const firstUp = el.querySelectorAll<HTMLButtonElement>('app-pattern-editor .step')[1];
    expect(firstUp.getAttribute('aria-pressed')).toBe('true');
    firstUp.click();
    await fixture.whenStable();
    expect(firstUp.getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelectorAll('app-visualizer app-strum-arrow')).toHaveLength(7);
  });

  it('toggles playback with the space bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const engine = TestBed.inject(StrumEngine);
    const toggle = vi.spyOn(engine, 'toggle').mockImplementation(() => undefined);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(toggle).toHaveBeenCalledOnce();
  });
});
