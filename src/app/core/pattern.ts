/**
 * A strum pattern is one bar of eighth-note subdivisions: two steps per beat.
 * Even indices are down strums on the beat ("1", "2", …); odd indices are
 * up strums on the "and".
 */
export type StrumPattern = boolean[];

export type StrumDirection = 'down' | 'up';

export interface TimeSignature {
  beats: number;
  noteValue: NoteValue;
}

export const NOTE_VALUES = [2, 4, 8] as const;
export type NoteValue = (typeof NOTE_VALUES)[number];

export const MIN_BEATS = 1;
export const MAX_BEATS = 12;
export const STEPS_PER_BEAT = 2;

export const MIN_BPM = 30;
export const MAX_BPM = 300;

export function stepDirection(step: number): StrumDirection {
  return step % STEPS_PER_BEAT === 0 ? 'down' : 'up';
}

export function stepLabel(step: number): string {
  return stepDirection(step) === 'down' ? String(step / STEPS_PER_BEAT + 1) : '&';
}

/** Default pattern: every down and up strum enabled ("1 & 2 & 3 & 4 &"). */
export function defaultPattern(beats: number): StrumPattern {
  return Array.from({ length: beats * STEPS_PER_BEAT }, () => true);
}

/** Resize a pattern to fit `beats`, keeping existing steps and filling new beats with the default. */
export function fitPattern(pattern: StrumPattern, beats: number): StrumPattern {
  const length = beats * STEPS_PER_BEAT;
  const fill = defaultPattern(beats);
  return Array.from({ length }, (_, i) => (i < pattern.length ? pattern[i] : fill[i]));
}

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return MIN_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function clampBeats(beats: number): number {
  if (!Number.isFinite(beats)) return 4;
  return Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round(beats)));
}

export function isNoteValue(value: unknown): value is NoteValue {
  return NOTE_VALUES.includes(value as NoteValue);
}

/** Parse a compact pattern string such as "D-DU-UDU" (D = down, U = up, anything else = rest). */
export function parsePattern(text: string): StrumPattern {
  return [...text].map((c, i) => c.toUpperCase() === (stepDirection(i) === 'down' ? 'D' : 'U'));
}

export function formatPattern(pattern: StrumPattern): string {
  return pattern.map((on, i) => (on ? (stepDirection(i) === 'down' ? 'D' : 'U') : '-')).join('');
}
