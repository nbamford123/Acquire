// src/components/AppShell.ts
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import type { AppState } from "../types.ts";
import { AuthService } from "../services/AuthService.ts";
import "./LoginView.ts";
import "./DashboardView.ts";
import "./GameBoardView.ts";

@customElement("app-shell")
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
  `;

  @state()
  private appState: AppState = {
    currentView: "login",
    user: null,
    selectedGameId: null,
  };

  private authService = AuthService.getInstance();

  public override connectedCallback() {
    super.connectedCallback();
    this.checkAuthentication();
  }

  private checkAuthentication() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.appState = {
        ...this.appState,
        user,
        currentView: "game-list",
      };
    }
  }

  private handleLogin = (event: CustomEvent<string>) => {
    this.appState = {
      ...this.appState,
      user: event.detail,
      currentView: "game-list",
    };
  };

  private handleLogout = () => {
    this.authService.logout();
    this.appState = {
      currentView: "login",
      user: null,
      selectedGameId: null,
    };
  };

  private handleGameSelect = (event: CustomEvent<string>) => {
    this.appState = {
      ...this.appState,
      selectedGameId: event.detail,
      currentView: "game-board",
    };
  };

  private handleBackToGameList = () => {
    this.appState = {
      ...this.appState,
      currentView: "game-list",
      selectedGameId: null,
    };
  };

  public override render() {
    // Simple guard: redirect to login if not authenticated
    if (!this.appState.user && this.appState.currentView !== "login") {
      this.appState = { ...this.appState, currentView: "login" };
    }

    return html`
      <div class="app-container">
        ${this.renderHeader()} ${this.renderCurrentView()}
      </div>
    `;
  }

  private renderHeader() {
    if (this.appState.currentView === "login") {
      return html`

      `;
    }

    return html`
      <header class="header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="app-title">Acquire</h1>
            ${this.appState.currentView === "game-board"
        ? html`
          <button
            @click="${this.handleBackToGameList}"
            class="back-button"
          >
            ← Back to Games
          </button>
        `
        : ""}
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
      case "login":
        return html`
          <login-view @user-login="${this.handleLogin}"></login-view>
        `;

      case "game-list":
        return html`
          <game-list-view
            .user="${this.appState.user}"
            @game-select="${this.handleGameSelect}"
          ></game-list-view>
        `;

      case "game-board":
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
