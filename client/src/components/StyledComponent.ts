import { css, type CSSResultGroup, LitElement } from 'lit';
import { unsafeCSS } from 'lit';
import { picoCSS } from '../pico-styles.ts';

export class StyledComponent extends LitElement {
  static override get styles(): CSSResultGroup {
    return [unsafeCSS(picoCSS)];
  }
}
