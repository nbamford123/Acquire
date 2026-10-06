import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { LightComponent } from './LightComponent.ts';
import { currentTheme, onSystemThemeChange, toggleTheme } from '../services/ThemeService.ts';

// Switches between light and dark; it shows the theme it switches to
@customElement('theme-toggle')
export class ThemeToggle extends LightComponent {
  static override styles = css`
    button {
      margin: 0;
      padding: 0.25rem 0.6rem;
      line-height: 1;
    }
  `;

  @state()
  private accessor theme = currentTheme();

  private stopWatching?: () => void;

  public override connectedCallback() {
    super.connectedCallback();
    this.stopWatching = onSystemThemeChange(() => this.theme = currentTheme());
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopWatching?.();
  }

  public override render() {
    const other = this.theme === 'dark' ? 'light' : 'dark';
    return html`
      <button
        class="secondary outline"
        aria-label="Switch to ${other} theme"
        title="Switch to ${other} theme"
        @click="${() => this.theme = toggleTheme()}"
      >
        <span aria-hidden="true">${other === 'dark' ? '🌙' : '☀️'}</span>
      </button>
    `;
  }
}
