import { Component, inject } from '@angular/core';
import { PatternEditor } from './components/pattern-editor/pattern-editor';
import { PatternLibrary } from './components/pattern-library/pattern-library';
import { Transport } from './components/transport/transport';
import { Visualizer } from './components/visualizer/visualizer';
import { StrumEngine } from './core/strum-engine';

const TEXT_ENTRY = /^(INPUT|SELECT|TEXTAREA)$/;

@Component({
  selector: 'app-root',
  imports: [Transport, Visualizer, PatternEditor, PatternLibrary],
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class App {
  private readonly engine = inject(StrumEngine);

  protected onKeydown(event: KeyboardEvent): void {
    if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
    if (target && TEXT_ENTRY.test(target.tagName) && !isCheckbox) return;
    event.preventDefault();
    this.engine.toggle();
  }
}
