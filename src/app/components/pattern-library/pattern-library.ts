import { Component, computed, inject, signal } from '@angular/core';
import { formatPattern } from '../../core/pattern';
import { PatternLibraryStore, SavedPattern } from '../../core/pattern-library-store';
import { SettingsStore } from '../../core/settings-store';

@Component({
  selector: 'app-pattern-library',
  styleUrl: './pattern-library.scss',
  templateUrl: './pattern-library.html',
})
export class PatternLibrary {
  private readonly settings = inject(SettingsStore);
  protected readonly library = inject(PatternLibraryStore);

  protected readonly selectedId = signal(this.library.presets[0].id);
  protected readonly selected = computed(() => this.library.find(this.selectedId()));
  protected readonly name = signal('');

  protected describe(p: SavedPattern): string {
    const { beats, noteValue } = p.timeSignature;
    return `${p.name} — ${beats}/${noteValue} ${formatPattern(p.pattern)}`;
  }

  protected load(): void {
    const p = this.selected();
    if (p) this.settings.loadPattern(p.pattern, p.timeSignature);
  }

  protected remove(): void {
    const p = this.selected();
    if (!p || p.builtIn || !confirm(`Delete pattern “${p.name}”?`)) return;
    this.library.remove(p.id);
    this.selectedId.set(this.library.presets[0].id);
  }

  protected save(event: Event): void {
    event.preventDefault();
    const name = this.name().trim();
    if (!name) return;
    const saved = this.library.save(name, this.settings.pattern(), this.settings.timeSignature());
    this.selectedId.set(saved.id);
    this.name.set('');
  }
}
