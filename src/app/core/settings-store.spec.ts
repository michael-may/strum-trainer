import { TestBed } from '@angular/core/testing';
import { formatPattern } from './pattern';
import { SETTINGS_KEY, SettingsStore, sanitizeSettings } from './settings-store';

describe('SettingsStore', () => {
  beforeEach(() => localStorage.clear());

  function create(): SettingsStore {
    TestBed.configureTestingModule({});
    return TestBed.inject(SettingsStore);
  }

  it('starts with the defaults', () => {
    const store = create();
    expect(store.bpm()).toBe(90);
    expect(store.timeSignature()).toEqual({ beats: 4, noteValue: 4 });
    expect(store.metronome()).toBe(true);
    expect(store.downSound()).toBe(true);
    expect(store.upSound()).toBe(false);
    expect(formatPattern(store.pattern())).toBe('DUDUDUDU');
  });

  it('toggles steps and resizes the pattern with the time signature', () => {
    const store = create();
    store.toggleStep(1);
    store.setTimeSignature({ beats: 3, noteValue: 4 });
    expect(formatPattern(store.pattern())).toBe('D-DUDU');
    store.setTimeSignature({ beats: 6, noteValue: 8 });
    expect(formatPattern(store.pattern())).toBe('D-DUDUDUDUDU');
  });

  it('persists to and restores from localStorage', () => {
    const store = create();
    store.setBpm(120);
    store.setUpSound(true);
    TestBed.tick();
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)!);
    expect(saved.bpm).toBe(120);

    TestBed.resetTestingModule();
    const restored = create();
    expect(restored.bpm()).toBe(120);
    expect(restored.upSound()).toBe(true);
  });

  it('ignores invalid stored data', () => {
    const s = sanitizeSettings({
      bpm: 'fast',
      timeSignature: { beats: 99, noteValue: 3 },
      metronome: 'yes',
      pattern: [true, 'x'],
    });
    expect(s.bpm).toBe(90);
    expect(s.timeSignature).toEqual({ beats: 12, noteValue: 4 });
    expect(s.metronome).toBe(true);
    expect(s.pattern).toHaveLength(24);
  });
});
