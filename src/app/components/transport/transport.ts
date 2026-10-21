import { Component, inject, signal } from '@angular/core';
import { MAX_BEATS, MAX_BPM, MIN_BEATS, MIN_BPM, NOTE_VALUES, NoteValue } from '../../core/pattern';
import { SettingsStore } from '../../core/settings-store';
import { StrumEngine } from '../../core/strum-engine';

const TAP_RESET_MS = 2000;
const TAP_SAMPLES = 5;

@Component({
  selector: 'app-transport',
  styleUrl: './transport.scss',
  templateUrl: './transport.html',
})
export class Transport {
  protected readonly settings = inject(SettingsStore);
  protected readonly engine = inject(StrumEngine);

  protected readonly minBpm = MIN_BPM;
  protected readonly maxBpm = MAX_BPM;
  protected readonly beatOptions = Array.from(
    { length: MAX_BEATS - MIN_BEATS + 1 },
    (_, i) => i + MIN_BEATS,
  );
  protected readonly noteValues = NOTE_VALUES;

  protected readonly tapFlash = signal(false);

  private taps: number[] = [];
  private flashTimer?: ReturnType<typeof setTimeout>;

  protected setBpm(value: number): void {
    if (Number.isFinite(value)) this.settings.setBpm(value);
  }

  protected nudgeBpm(delta: number): void {
    this.settings.setBpm(this.settings.bpm() + delta);
  }

  protected setBeats(value: string): void {
    this.settings.setTimeSignature({ ...this.settings.timeSignature(), beats: Number(value) });
  }

  protected setNoteValue(value: string): void {
    this.settings.setTimeSignature({
      ...this.settings.timeSignature(),
      noteValue: Number(value) as NoteValue,
    });
  }

  /** Tap tempo: average the gaps between the last few taps; a long pause starts over. */
  protected tap(): void {
    this.tapFlash.set(true);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.tapFlash.set(false), 100);

    const now = performance.now();
    if (this.taps.length && now - this.taps[this.taps.length - 1] > TAP_RESET_MS) this.taps = [];
    this.taps = [...this.taps, now].slice(-TAP_SAMPLES);
    if (this.taps.length < 2) return;
    const avg = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
    this.settings.setBpm(60000 / avg);
  }
}
