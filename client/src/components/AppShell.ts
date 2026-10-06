// src/components/AppShell.ts
import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Toastify from 'toastify-js';

import type { AppState, Route } from '../types.ts';
import { RouterService } from '../services/RouterService.ts';
import { bus } from '../services/EventBus.ts';
import { clearUser, getUser, setUser } from '../services/UserService.ts';
import { LightComponent } from './LightComponent.ts';
import './LoginView.ts';
import './DashboardView.ts';
import './GameBoardView.ts';
import './ThemeToggle.ts';

interface ConfirmDialogConfig {
  title: string;
  message: string;
  resolve: (value?: unknown) => void;
}

@customElement('app-shell')
export class AppShell extends LightComponent {
  static override styles = [
    css`
      /* Root app layout: header outside of the scrollable content area */
      .app-root {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--pico-background-color);
        width: 100%;
      }
      /* The header sits above the scrollable content */
      .header {
        background-color: var(--pico-background-color);
        border-bottom: 1px solid var(--pico-muted-border-color);
        padding-left: 16px;
        padding-right: 16px;
        width: 100%;
        box-sizing: border-box;
        z-index: 1;
      }
      /* Compact on every size: Pico's nav spacing made the header a quarter of a landscape phone */
      .header h1 {
        margin: 0;
        font-size: 1.75rem;
      }
      .header nav li {
        padding-block: 0.5rem;
      }
      /* Phones drop the welcome and shorten Back, so the header stays on one line */
      @media (max-width: 576px) {
        .header {
          padding-inline: 0.5rem;
        }
        .header h1 {
          font-size: 1.375rem;
        }
        .header nav li {
          padding-inline: 0.25rem;
        }
        .wide-only {
          display: none;
        }
      }
      /* Main content area grows to fill the space below the header. The page scrolls, not this,
        so the board can stay in view while the rest of the game scrolls beside it. */
      .content {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        padding-inline: clamp(0.75rem, 3vw, 1.5rem);
      }
      /* The login screen has no header, so the theme toggle sits in the corner */
      .login-theme {
        position: absolute;
        top: 1rem;
        right: 1rem;
      }
      .content.center {
        justify-content: center;
      }
      .back-button {
        color: var(--pico-primary);
        font-weight: 500;
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.15s ease;
      }
      .back-button:hover {
        color: var(--pico-primary-hover);
      }
    `,
  ];

  @state()
  private accessor appState: AppState = {
    currentView: 'login',
    user: null,
    selectedGameId: null,
    error: null,
  };

  @state()
  private accessor dialogConfig: ConfirmDialogConfig | undefined;

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
    }
  }

  private updateAppState(newState: Partial<AppState>) {
    this.appState = {
      ...this.appState,
      ...newState,
    };
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
    // Always update internal app state so unit tests and UI can reflect errors
    this.updateAppState({ error: event.detail });
    // Try to show a toast when running in a DOM environment. Guard access
    // so server-side or test environments without `document` won't throw.
    try {
      if (typeof document !== 'undefined' && typeof Toastify === 'function') {
        // Toastify may reference `document` internally; wrap in try/catch
        Toastify({
          className: 'toastify-error',
          text: event.detail,
          duration: 3000,
          style: {
            background: 'var(--pico-color-red-500)',
          },
        }).showToast();
      }
    } catch (e) {
      // Swallow errors from Toastify in non-browser test environments
    }
  };

  // Clear the current error from app state (used by tests and UI)
  public clearError() {
    this.updateAppState({ error: null });
  }

  public confirm = (title: string, message: string) => {
    return new Promise((resolve) => {
      this.dialogConfig = { title, message, resolve };
      this.querySelector<HTMLDialogElement>('.confirm-dialog')?.showModal();
    });
  };

  private closeConfirmDialog = () => {
    console.log('closing dialog');
    this.querySelector<HTMLDialogElement>('.confirm-dialog')?.close();
  };

  private onDialogCancelDelete = () => {
    this.dialogConfig?.resolve(false);
    this.closeConfirmDialog();
  };

  public override render() {
    const loginView = this.appState.currentView === 'login';
    return html`
      <div class="app-root">
        ${loginView
          ? html`
            <div class="login-theme">
              <theme-toggle></theme-toggle>
            </div>
          `
          : this.renderHeader()}
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
            <li>
              <h1>Acquire</h1>
            </li>
          </ul>
          <ul>
            ${this.appState.currentView === 'game'
              ? html`
                <li>
                  <button
                    @click="${this.handleBackToGameList}"
                    class="back-button"
                    aria-label="Back to games"
                  >
                    ← <span class="wide-only">Back to </span>Games
                  </button>
                </li>
              `
              : ''}
            <li class="wide-only">Welcome, ${this.appState.user}</li>
            <li><theme-toggle></theme-toggle></li>
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
