import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AuthService } from "../services/AuthService.ts";

@customElement("login-view")
export class LoginView extends LitElement {
  @state()
  private email = "";

  @state()
  private loading = false;

  private authService = AuthService.getInstance();

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
    }

    .container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
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

    .button {
      width: 100%;
      padding: 0.5rem 1rem;
      background: #2563eb;
      color: white;
      border-radius: 0.375rem;
      border: none;
      font-weight: 500;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .button:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }
  `;

  private async handleSubmit(e: Event) {
    console.log("handle submit called");
    e.preventDefault();
    if (!this.email) return;

    this.loading = true;

    try {
      const user = await this.authService.login(this.email);
      // Dispatch success event to parent
      this.dispatchEvent(
        new CustomEvent<string>("user-login", {
          detail: user,
          bubbles: true,
        }),
      );
    } catch (error) {
      console.log("error occured", error);
      // Dispatch error event to AppShell
      const errorMessage = error instanceof Error
        ? error.message
        : "Login failed";
      this.dispatchEvent(
        new CustomEvent<string>("app-error", {
          detail: errorMessage,
          bubbles: true,
        }),
      );
    } finally {
      this.loading = false;
    }
  }

  public override render() {
    return html`
      <div class="container">
        <div class="form-wrapper">
          <div class="card">
            <div class="header">
              <h2 class="title">Welcome to Acquire</h2>
              <p class="subtitle">Sign in to start playing</p>
            </div>

            <form @submit="${this.handleSubmit}" class="form">
              <div class="field">
                <label class="label">Email</label>
                <input
                  type="text"
                  class="input"
                  .value="${this.email}"
                  @input="${(e: Event) =>
                    this.email = (e.target as HTMLInputElement).value}"
                  required
                />
              </div>

              <button
                type="submit"
                class="button"
                ?disabled="${this.loading}"
              >
                ${this.loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }
}
