// src/components/AppShell.ts
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import type { AppState } from '../types.ts';
import { AuthService } from '../services/AuthService.ts';
import './LoginView.ts';
import './DashboardView.ts';
import './GameBoardView.ts';

@customElement('app-shell')
export class AppShell extends LitElement {
  static override styles = css`
    /* Your existing styles... */

    .app-container {
      min-height: 100vh;
      background-color: #f9fafb;
    }

    .header {
      background: white;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid #e5e7eb;
    }

    .header-content {
      max-width: 80rem;
      margin: 0 auto;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .app-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .back-button {
      color: #2563eb;
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .back-button:hover {
      color: #1d4ed8;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .welcome-text {
      font-size: 0.875rem;
      color: #4b5563;
    }

    .logout-button {
      font-size: 0.875rem;
      color: #dc2626;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .logout-button:hover {
      color: #b91c1c;
    }

    .error-banner {
      background-color: #dc2626;
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      animation: slideDown 0.3s ease-out;
    }

    .error-message {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .error-dismiss {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: background-color 0.15s ease;
    }

    .error-dismiss:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;

  static override properties = {
    appState: { type: Object, state: true },
  };

  private appState: AppState = {
    currentView: 'login',
    user: null,
    selectedGameId: null,
    error: null,
  };

  private updateAppState(newState: Partial<AppState>) {
    const oldState = this.appState;
    this.appState = {
      ...this.appState,
      ...newState,
    };
    this.requestUpdate('appState', oldState);
  }

  private authService = AuthService.getInstance();
  private errorTimer: number | null = null;

  public override connectedCallback() {
    super.connectedCallback();
    this.checkAuthentication();
    this.addEventListener('app-error', this.handleError as EventListener);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('app-error', this.handleError as EventListener);
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
    }
  }

  // Why have this *and* the custom event to set the user?
  private checkAuthentication() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.updateAppState({
        user,
        currentView: 'game-list',
      });
    }
  }

  private handleLogin = (
    event: CustomEvent<{ success: boolean; email: string }>,
  ) => {
    this.updateAppState({
      user: event.detail.email,
      currentView: 'game-list',
    });
  };

  private handleLogout = () => {
    this.authService.logout();
    this.updateAppState({
      currentView: 'login',
      user: null,
      selectedGameId: null,
      error: null,
    });
  };

  private handleGameSelect = (event: CustomEvent<string>) => {
    this.updateAppState({
      selectedGameId: event.detail,
      currentView: 'game-board',
    });
  };

  private handleBackToGameList = () => {
    this.updateAppState({
      currentView: 'game-list',
      selectedGameId: null,
    });
  };

  private handleError = (event: CustomEvent<string>) => {
    // Clear any existing timer
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
    }

    // Set the error
    this.updateAppState({
      error: event.detail,
    });

    // Auto-dismiss after 5 seconds
    this.errorTimer = setTimeout(() => {
      this.clearError();
    }, 5000);
  };

  private clearError = () => {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    this.updateAppState({
      error: null,
    });
  };

  public override render() {
    return html`
      <div class="app-container">
        ${this.appState.error ? this.renderErrorBanner() : ''} ${this
          .renderHeader()} ${this.renderCurrentView()}
      </div>
    `;
  }

  private renderErrorBanner() {
    return html`
      <div class="error-banner">
        <span class="error-message">${this.appState.error}</span>
        <button
          @click="${this.clearError}"
          class="error-dismiss"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    `;
  }

  private renderHeader() {
    if (this.appState.currentView === 'login') {
      return html`

      `;
    }

    return html`
      <header class="header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="app-title">Acquire</h1>
            ${this.appState.currentView === 'game-board'
              ? html`
                <button
                  @click="${this.handleBackToGameList}"
                  class="back-button"
                >
                  ← Back to Games
                </button>
              `
              : ''}
          </div>
          <div class="header-right">
            <span class="welcome-text">
              Welcome, ${this.appState.user}
            </span>
            <button
              @click="${this.handleLogout}"
              class="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
    `;
  }
  private renderCurrentView() {
    switch (this.appState.currentView) {
      case 'login':
        return html`
          <login-view
            @user-login="${this.handleLogin}"
            @app-error="${this.handleError}"
          ></login-view>
        `;

      case 'game-list':
        return html`
          <dashboard-view
            .user="${this.appState.user}"
            @game-select="${this.handleGameSelect}"
          ></dashboard-view>
        `;

      case 'game-board':
        return html`
          <game-board-view
            .gameId="${this.appState.selectedGameId}"
            .playerId="${this.appState.user}"
            @back-to-list="${this.handleBackToGameList}"
          ></game-board-view>
        `;

      default:
        return html`
          <div>Unknown view</div>
        `;
    }
  }
}
