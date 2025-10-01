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
        :host {
          display: flex;
          height: 100vh;
          justify-content: center;
          align-items: center;
        }

        .form-wrapper {
          max-width: 28rem;
          width: 100%;
          padding: 2rem;
        }

        .card {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          padding: 2rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .subtitle {
          margin-top: 0.5rem;
          color: #6b7280;
          margin-bottom: 0;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .error {
          color: #dc2626;
          font-size: 0.875rem;
          margin: 0;
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
        <header>
          <h2>Welcome to Acquire</h2>
          <p>Sign in to start playing</p>
        </header>
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
