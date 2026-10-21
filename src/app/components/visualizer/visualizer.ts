import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { stepDirection, stepLabel } from '../../core/pattern';
import { SettingsStore } from '../../core/settings-store';
import { StrumEngine } from '../../core/strum-engine';
import { StrumArrow } from './strum-arrow';

@Component({
  selector: 'app-visualizer',
  imports: [StrumArrow],
  styleUrl: './visualizer.scss',
  templateUrl: './visualizer.html',
})
export class Visualizer {
  protected readonly settings = inject(SettingsStore);
  private readonly engine = inject(StrumEngine);
  private readonly playhead = viewChild.required<ElementRef<HTMLElement>>('playhead');

  protected readonly steps = computed(() =>
    this.settings.pattern().map((on, i) => ({
      on,
      direction: stepDirection(i),
      label: stepLabel(i),
    })),
  );
  protected readonly activeStep = signal<number | null>(null);
  protected readonly playing = this.engine.playing;
  protected readonly screenLocked = this.engine.screenLocked;

  private frameId = 0;

  constructor() {
    effect(() => {
      cancelAnimationFrame(this.frameId);
      if (this.playing()) {
        this.frameId = requestAnimationFrame(this.frame);
      } else {
        this.activeStep.set(null);
        this.placePlayhead(0, 0, this.steps().length);
      }
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frameId));
  }

  private readonly frame = (): void => {
    const steps = this.steps().length;
    const pos = this.engine.position();
    if (pos) {
      const step = pos.step % steps;
      this.activeStep.set(step);
      this.placePlayhead(step, pos.fraction, steps);
    } else {
      this.activeStep.set(null);
      this.placePlayhead(0, 0, steps);
    }
    this.frameId = requestAnimationFrame(this.frame);
  };

  /** Markers sit in the middle of each step column, so the line crosses them on the beat. */
  private placePlayhead(step: number, fraction: number, steps: number): void {
    const x = ((step + 0.5 + fraction) / steps) % 1;
    this.playhead().nativeElement.style.transform = `translateX(${(x * 100).toFixed(3)}%)`;
  }
}
