import { Component, computed, inject } from '@angular/core';
import { stepDirection, stepLabel } from '../../core/pattern';
import { SettingsStore } from '../../core/settings-store';

@Component({
  selector: 'app-pattern-editor',
  styleUrl: './pattern-editor.scss',
  templateUrl: './pattern-editor.html',
})
export class PatternEditor {
  protected readonly settings = inject(SettingsStore);

  protected readonly steps = computed(() =>
    this.settings.pattern().map((on, i) => ({
      on,
      direction: stepDirection(i),
      label: stepLabel(i),
    })),
  );
}
