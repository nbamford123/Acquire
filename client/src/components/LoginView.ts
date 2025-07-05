import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { tw } from "twind";

import { AuthService } from "../services/AuthService.ts";

@customElement("login-view")
export class LoginView extends LitElement {
  @state()
  private email = "";
  @state()
  private loading = false;
  @state()
  private error = "";

  private authService = AuthService.getInstance();

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
    }
  `;

  private async handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.email) return;

    this.loading = true;
    this.error = "";

    try {
      const user = await this.authService.login(this.email);

      // Dispatch event to parent
      this.dispatchEvent(
        new CustomEvent<string>("user-login", {
          detail: user,
          bubbles: true,
        }),
      );
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Login failed";
    } finally {
      this.loading = false;
    }
  }

  public override render() {
    return html`
      <div class="${tw(
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600",
      )}">
        <div class="${tw("max-w-md w-full space-y-8 p-8")}">
          <div class="${tw("bg-white rounded-lg shadow-lg p-8")}">
            <div class="${tw("text-center mb-8")}">
              <h2 class="${tw("text-3xl font-bold text-gray-900")}">Welcome</h2>
              <p class="${tw(
        "mt-2 text-gray-600",
      )}">Sign in to start playing</p>
            </div>

            <form @submit="${this.handleSubmit}" class="${tw("space-y-6")}">
              <div>
                <label class="${tw(
        "block text-sm font-medium text-gray-700 mb-2",
      )}">
                  Email
                </label>
                <input
                  type="text"
                  .value="${this.email}"
                  @input="${(e: Event) =>
        this.email = (e.target as HTMLInputElement).value}"
                  class="${tw(
        "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
      )}"
                  required
                />
              </div>

              ${this.error
        ? html`
          <div class="${tw("text-red-600 text-sm")}">
            ${this.error}
          </div>
        `
        : ""}

              <button
                type="submit"
                ?disabled="${this.loading}"
                class="${tw(
        "w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium",
      )}"
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
