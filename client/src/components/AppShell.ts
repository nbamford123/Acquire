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

interface ConfirmDialogConfig {
  title: string;
  message: string;
  resolve: (value?: unknown) => void;
}

@customElement('app-shell')
export class AppShell extends StyledComponent {
  static override styles = [
    super.styles,
    css`
      /* Root app layout: header outside of the scrollable content area */
      .app-root {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--pico-color-azure-50);
        width: 100%;
      }
      /* The header sits above the scrollable content */
      .header {
        background-color: var(--pico-background-color);
        border-bottom: 1px solid var(--pico-color-azure-150);
        padding-left: 16px;
        padding-right: 16px;
        width: 100%;
        box-sizing: border-box;
        z-index: 1;
      }
      /* Main content area grows to fill available space and scrolls vertically when needed */
      .content {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        box-sizing: border-box;
        padding: 16px;
      }
      .content.center {
        justify-content: center;
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
    dialogConfig: { type: Object, state: true },
  };

  private appState: AppState = {
    currentView: 'login',
    user: null,
    selectedGameId: null,
    error: null,
  };

  private dialogConfig?: ConfirmDialogConfig;

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

  public confirm = (title: string, message: string) => {
    return new Promise((resolve) => {
      this.dialogConfig = { title, message, resolve };
      this.requestUpdate();
      this.shadowRoot?.querySelector<HTMLDialogElement>('.confirm-dialog')?.showModal();
    });
  };

  private closeConfirmDialog = () => {
    console.log('closing dialog');
    this.shadowRoot?.querySelector<HTMLDialogElement>('.confirm-dialog')?.close();
  };

  private onDialogCancelDelete = () => {
    this.dialogConfig?.resolve(false);
    this.closeConfirmDialog();
  };

  public override render() {
    const loginView = this.appState.currentView === 'login';
    return html`
      <div class="app-root">
        ${loginView ? '' : this.renderHeader()}
        <main class="${`content${loginView ? ' center' : ''}`}">
          <dialog class="confirm-dialog" @cancel="${this.onDialogCancelDelete}">
            <article>
              <h2>${this.dialogConfig?.title}</h2>
              <p>
                ${this.dialogConfig?.message}
              </p>
              <footer>
                <button class="secondary" @click="${this.onDialogCancelDelete}">
                  Cancel
                </button>
                <button @click="${() => {
                  this.dialogConfig?.resolve(true);
                  this.closeConfirmDialog();
                }}">Confirm</button>
              </footer>
            </article>
          </dialog>
          ${this.renderCurrentView()}
        </main>
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
        <nav>
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
            .showConfirmationDialog="${this.confirm}"
          ></dashboard-view>
        `;

      case 'game':
        return html`
          <game-board-view
            .gameId="${this.appState.selectedGameId}"
            .user="${this.appState.user}"
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
