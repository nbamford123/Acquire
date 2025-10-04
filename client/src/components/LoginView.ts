import { css, type CSSResultGroup, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { postApi } from '../services/ApiService.ts';
import { getUser } from '../services/UserService.ts';

@customElement('login-view')
export class LoginView extends StyledComponent {
  static override properties = {
    loading: { type: Boolean, state: true },
  };
  private email = '';
  private loading = false;

  constructor() {
    super();
    const persisted = getUser();
    if (persisted) {
      this.email = persisted;
    }
  }

  static override get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .form-wrapper {
          margin-bottom: 0;
          max-width: 28rem;
          width: 100%;
          padding: 2rem;
        }
      `,
    ];
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.email) return;

    this.loading = true;
    this.requestUpdate();

    try {
      const loginResult = await postApi('/api/login', { email: this.email });
      if (loginResult !== null) {
        // Dispatch success event to parent
        this.dispatchEvent(
          new CustomEvent<string>('user-login', {
            detail: loginResult,
            bubbles: true,
          }),
        );
      }
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  public override render() {
    return html`
      <article class="form-wrapper">
        <h1>Welcome to Acquire</h1>
        <p>Sign in to start playing</p>
        <form @submit="${this.handleSubmit}">
          <label>Email
            <input
              type="email"
              .value="${this.email}"
              @input="${(e: Event) => this.email = (e.target as HTMLInputElement).value}"
              required
              placeholder="Email"
            />
          </label>
          <button
            type="submit"
            ?disabled="${this.loading}"
            aria-busy="${this.loading}"
          >
            ${this.loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </article>
    `;
  }
}
