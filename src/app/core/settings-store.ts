import { Service, computed, effect, signal } from '@angular/core';
import {
  StrumPattern,
  TimeSignature,
  clampBeats,
  clampBpm,
  defaultPattern,
  fitPattern,
  isNoteValue,
} from './pattern';
import { isRecord, readJson, writeJson } from './storage';

export interface Settings {
  bpm: number;
  timeSignature: TimeSignature;
  metronome: boolean;
  downSound: boolean;
  upSound: boolean;
  pattern: StrumPattern;
}

export const SETTINGS_KEY = 'strum-trainer.settings.v1';

export function defaultSettings(): Settings {
  return {
    bpm: 90,
    timeSignature: { beats: 4, noteValue: 4 },
    metronome: true,
    downSound: true,
    upSound: false,
    pattern: defaultPattern(4),
  };
}

/** Merge untrusted stored data over the defaults, discarding anything invalid. */
export function sanitizeSettings(value: unknown): Settings {
  const s = defaultSettings();
  if (!isRecord(value)) return s;

  if (typeof value['bpm'] === 'number') s.bpm = clampBpm(value['bpm']);
  const ts = value['timeSignature'];
  if (isRecord(ts)) {
    if (typeof ts['beats'] === 'number') s.timeSignature.beats = clampBeats(ts['beats']);
    if (isNoteValue(ts['noteValue'])) s.timeSignature.noteValue = ts['noteValue'];
  }
  for (const key of ['metronome', 'downSound', 'upSound'] as const) {
    const v = value[key];
    if (typeof v === 'boolean') s[key] = v;
  }
  const pattern = value['pattern'];
  s.pattern =
    Array.isArray(pattern) && pattern.every((v) => typeof v === 'boolean')
      ? fitPattern(pattern, s.timeSignature.beats)
      : defaultPattern(s.timeSignature.beats);
  return s;
}

@Service()
export class SettingsStore {
  private readonly state = signal<Settings>(sanitizeSettings(readJson(SETTINGS_KEY)));

  readonly settings = this.state.asReadonly();
  readonly bpm = computed(() => this.state().bpm);
  readonly timeSignature = computed(() => this.state().timeSignature);
  readonly metronome = computed(() => this.state().metronome);
  readonly downSound = computed(() => this.state().downSound);
  readonly upSound = computed(() => this.state().upSound);
  readonly pattern = computed(() => this.state().pattern);

  constructor() {
    effect(() => writeJson(SETTINGS_KEY, this.state()));
  }

  setBpm(bpm: number): void {
    this.patch({ bpm: clampBpm(bpm) });
  }

  /** Changing the time signature resizes the pattern so it always fills exactly one bar. */
  setTimeSignature(timeSignature: TimeSignature): void {
    this.loadPattern(this.pattern(), timeSignature);
  }

  setMetronome(on: boolean): void {
    this.patch({ metronome: on });
  }

  setDownSound(on: boolean): void {
    this.patch({ downSound: on });
  }

  setUpSound(on: boolean): void {
    this.patch({ upSound: on });
  }

  toggleStep(step: number): void {
    this.state.update((s) => ({
      ...s,
      pattern: s.pattern.map((on, i) => (i === step ? !on : on)),
    }));
  }

  setPattern(pattern: StrumPattern): void {
    this.state.update((s) => ({ ...s, pattern: fitPattern(pattern, s.timeSignature.beats) }));
  }

  /** Apply a pattern together with the time signature it was written for. */
  loadPattern(pattern: StrumPattern, timeSignature: TimeSignature): void {
    const beats = clampBeats(timeSignature.beats);
    this.state.update((s) => ({
      ...s,
      timeSignature: { beats, noteValue: timeSignature.noteValue },
      pattern: fitPattern(pattern, beats),
    }));
  }

  resetPattern(): void {
    this.setPattern(defaultPattern(this.timeSignature().beats));
  }

  clearPattern(): void {
    this.setPattern(this.pattern().map(() => false));
  }

  private patch(partial: Partial<Settings>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }
}
