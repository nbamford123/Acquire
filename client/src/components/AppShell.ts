// src/components/AppShell.ts
import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import Toastify from 'toastify-js';

import type { AppState, Route } from '../types.ts';
import { RouterService } from '../services/RouterService.ts';
import { bus } from '../services/EventBus.ts';
import { clearUser, getUser, setUser } from '../services/UserService.ts';
import { StyledComponent } from './StyledComponent.ts';
import './LoginView.ts';
import './DashboardView.ts';
import './GameBoardView.ts';

@customElement('app-shell')
export class AppShell extends StyledComponent {
  static override styles = [
    super.styles,
    css`
      .app-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
        background-color: var(--pico-color-azure-50);
      }

      .header {
        background-color: white;
        border-bottom: 1px solid var(--pico-color-azure-150);
        padding-left: 16px;
        padding-right: 16px;
        width: 100%;
      }

      .back-button {
        color: var(--pico-color-blue-500);
        font-weight: 500;
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.15s ease;
      }

      .back-button:hover {
        color: var(--pico-color-blue-650);
      }

      .toastify-error {
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.75rem 1rem;
      }
    `,
  ];

  static override properties = {
    appState: { type: Object, state: true },
  };

  private appState: AppState = {
    currentView: 'login',
    user: null,
    selectedGameId: null,
    error: null,
  };

  private router = RouterService.getInstance();

  constructor() {
    super();
    // Subscribe to route changes
    this.router.subscribe((route: Route) => {
      this.appState = {
        ...this.appState,
        currentView: route.view,
        selectedGameId: route.gameId || null,
      };
      this.requestUpdate();
    });
  }

  public override connectedCallback() {
    super.connectedCallback();
    this.router.init();

    bus.addEventListener('app-error', this.handleError as EventListener);
    bus.addEventListener(
      'auth-error',
      this.handleSessionExpired as EventListener,
    );
    this.loadPersistedState();
  }

  private loadPersistedState() {
    // Rehydrate persisted user on attach so reloads restore UI state.
    const persisted = getUser();
    if (persisted) {
      this.appState = {
        ...this.appState,
        user: persisted,
      };
      // ensure Lit knows state changed
      this.requestUpdate();
    }
  }

  private updateAppState(newState: Partial<AppState>) {
    const oldState = this.appState;
    this.appState = {
      ...this.appState,
      ...newState,
    };
    this.requestUpdate('appState', oldState);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    bus.removeEventListener('app-error', this.handleError as EventListener);
    bus.removeEventListener(
      'auth-error',
      this.handleSessionExpired as EventListener,
    );
  }

  private handleLogin = (
    event: CustomEvent<{ success: boolean; user: string }>,
  ) => {
    this.updateAppState({
      user: event.detail.user,
    });
    // persist username
    setUser(event.detail.user);
    this.router.navigateTo('/dashboard');
  };

  private handleSessionExpired = () => {
    this.updateAppState({
      user: null,
      selectedGameId: null,
      error: 'Session expired or invalid. Please log in again.',
    });
    clearUser();
    this.router.navigateTo('/login');
  };

  private handleLogout = () => {
    this.updateAppState({
      user: null,
      selectedGameId: null,
      error: null,
    });
    clearUser();
    this.router.navigateTo('/login');
  };

  private handleGameSelect = (event: CustomEvent<string>) => {
    this.router.navigateTo(`/game/${event.detail}`);
  };

  private handleBackToGameList = () => {
    this.updateAppState({
      selectedGameId: null,
    });
    this.router.navigateTo('/dashboard');
  };

  private handleError = (event: CustomEvent<string>) => {
    Toastify({
      className: 'toastify-error',
      text: event.detail,
      duration: 3000,
      style: {
        background: 'var(--pico-color-red-500)',
      },
    }).showToast();
  };

  public override render() {
    return html`
      <main class="app-container">
        ${this.renderHeader()} ${this.renderCurrentView()}
      </main>
    `;
  }

  private renderHeader() {
    if (this.appState.currentView === 'login') {
      return html`

      `;
    }

    return html`
      <header>
        <nav class="header">
          <ul>
            <li><h1>Acquire</h1></li>
          </ul>
          <ul>
            ${this.appState.currentView === 'game'
              ? html`
                <li>
                  <button
                    @click="${this.handleBackToGameList}"
                    class="back-button"
                  >
                    ← Back to Games
                  </button>
                </li>
              `
              : ''}
            <li>Welcome, ${this.appState.user}</li>
            <li>
              <button
                class="secondary"
                @click="${this.handleLogout}"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </header>
    `;
  }

  private renderCurrentView() {
    switch (this.appState.currentView) {
      case 'login':
        return html`
          <login-view
            @user-login="${this.handleLogin}"
          ></login-view>
        `;

      case 'game-list':
        return html`
          <dashboard-view
            .user="${this.appState.user}"
            @game-select="${this.handleGameSelect}"
          ></dashboard-view>
        `;

      case 'game':
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
