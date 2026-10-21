import { Component, input } from '@angular/core';
import { StrumDirection } from '../../core/pattern';

@Component({
  selector: 'app-strum-arrow',
  template: `
    <svg viewBox="0 0 40 100" aria-hidden="true" [class.up]="direction() === 'up'">
      <path d="M20 6v80M6 70l14 18 14-18" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .up {
      transform: rotate(180deg);
    }
  `,
})
export class StrumArrow {
  readonly direction = input.required<StrumDirection>();
}
