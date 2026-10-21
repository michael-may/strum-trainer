import { Service, computed, effect, signal } from '@angular/core';
import {
  StrumPattern,
  TimeSignature,
  clampBeats,
  fitPattern,
  isNoteValue,
  parsePattern,
} from './pattern';
import { isRecord, readJson, writeJson } from './storage';

export interface SavedPattern {
  id: string;
  name: string;
  timeSignature: TimeSignature;
  pattern: StrumPattern;
  builtIn?: boolean;
}

export const LIBRARY_KEY = 'strum-trainer.library.v1';

function preset(id: string, name: string, beats: number, steps: string): SavedPattern {
  return {
    id: `preset:${id}`,
    name,
    timeSignature: { beats, noteValue: 4 },
    pattern: parsePattern(steps),
    builtIn: true,
  };
}

export const PRESETS: readonly SavedPattern[] = [
  preset('eighths', 'Straight eighths', 4, 'DUDUDUDU'),
  preset('downs', 'Downs only', 4, 'D-D-D-D-'),
  preset('old-faithful', 'Old faithful (D DU UDU)', 4, 'D-DU-UDU'),
  preset('rock', 'Rock (D D DUDU)', 4, 'D-D-DUDU'),
  preset('offbeat', 'Offbeat ups', 4, '-U-U-U-U'),
  preset('waltz', 'Waltz (D DU DU)', 3, 'D-DUDU'),
];

export function sanitizeLibrary(value: unknown): SavedPattern[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): SavedPattern[] => {
    if (!isRecord(item) || typeof item['id'] !== 'string' || typeof item['name'] !== 'string') {
      return [];
    }
    const ts = item['timeSignature'];
    const pattern = item['pattern'];
    if (
      !isRecord(ts) ||
      typeof ts['beats'] !== 'number' ||
      !isNoteValue(ts['noteValue']) ||
      !Array.isArray(pattern) ||
      !pattern.every((v) => typeof v === 'boolean')
    ) {
      return [];
    }
    const beats = clampBeats(ts['beats']);
    return [
      {
        id: item['id'],
        name: item['name'],
        timeSignature: { beats, noteValue: ts['noteValue'] },
        pattern: fitPattern(pattern, beats),
      },
    ];
  });
}

@Service()
export class PatternLibraryStore {
  private readonly saved = signal<SavedPattern[]>(sanitizeLibrary(readJson(LIBRARY_KEY)));

  readonly presets = PRESETS;
  readonly userPatterns = this.saved.asReadonly();
  readonly all = computed(() => [...PRESETS, ...this.saved()]);

  constructor() {
    effect(() => writeJson(LIBRARY_KEY, this.saved()));
  }

  find(id: string): SavedPattern | undefined {
    return this.all().find((p) => p.id === id);
  }

  /** Save a pattern under `name`, replacing any user pattern with the same name. */
  save(name: string, pattern: StrumPattern, timeSignature: TimeSignature): SavedPattern {
    const trimmed = name.trim();
    const existing = this.saved().find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    const entry: SavedPattern = {
      id:
        existing?.id ?? `user:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      timeSignature: { ...timeSignature },
      pattern: [...pattern],
    };
    this.saved.update((list) =>
      existing ? list.map((p) => (p.id === existing.id ? entry : p)) : [...list, entry],
    );
    return entry;
  }

  remove(id: string): void {
    this.saved.update((list) => list.filter((p) => p.id !== id));
  }
}
