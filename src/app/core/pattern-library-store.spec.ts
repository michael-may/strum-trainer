import { TestBed } from '@angular/core/testing';
import { parsePattern } from './pattern';
import { LIBRARY_KEY, PRESETS, PatternLibraryStore } from './pattern-library-store';

describe('PatternLibraryStore', () => {
  beforeEach(() => localStorage.clear());

  function create(): PatternLibraryStore {
    TestBed.configureTestingModule({});
    return TestBed.inject(PatternLibraryStore);
  }

  it('includes the built-in presets', () => {
    const store = create();
    expect(store.all().length).toBe(PRESETS.length);
    expect(store.userPatterns()).toEqual([]);
  });

  it('saves, overwrites by name, persists and removes user patterns', () => {
    const store = create();
    const ts = { beats: 4, noteValue: 4 } as const;
    const first = store.save('  Mine ', parsePattern('D-D-D-D-'), ts);
    expect(first.name).toBe('Mine');
    const second = store.save('mine', parsePattern('DUDUDUDU'), ts);
    expect(second.id).toBe(first.id);
    expect(store.userPatterns()).toHaveLength(1);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(LIBRARY_KEY)!)).toHaveLength(1);

    TestBed.resetTestingModule();
    const restored = create();
    expect(restored.find(first.id)?.pattern).toEqual(parsePattern('DUDUDUDU'));
    restored.remove(first.id);
    expect(restored.userPatterns()).toEqual([]);
  });

  it('drops malformed stored entries', () => {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify([{ id: 1 }, 'x', { id: 'a', name: 'ok' }]));
    expect(create().userPatterns()).toEqual([]);
  });
});
