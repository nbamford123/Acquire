// src/components/AppShell.ts
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { tw } from "twind";

import type { AppState } from "../types.ts";
import { AuthService } from "../services/AuthService.ts";
import "./LoginView.ts";
import "./DashboardView.ts";
import "./GameBoardView.ts";

@customElement("app-shell")
export class AppShell extends LitElement {
  @state()
  private appState: AppState = {
    currentView: "login",
    user: null,
    selectedGameId: null,
  };

  private authService = AuthService.getInstance();

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
    }
  `;

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
      <div class="${tw('min-h-screen bg-gray-50')}">
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
      <header class="${tw('bg-white shadow-sm border-b')}">
        <div class="${tw('max-w-7xl mx-auto px-4 py-3 flex justify-between items-center')}">
          <div class="${tw('flex items-center gap-4')}">
            <h1 class="${tw('text-xl font-bold text-gray-900')}">Acquire</h1>

            ${this.appState.currentView === "game-board"
        ? html`
          <button
            @click="${this.handleBackToGameList}"
            class="${tw('text-blue-600 hover:text-blue-800 font-medium')}"
          >
            ← Back to Games
          </button>
        `
        : ""}
          </div>

          <div class="${tw('flex items-center gap-4')}">
            <span class="${tw('text-sm text-gray-600')}">
              Welcome, ${this.appState.user}
            </span>
            <button
              @click="${this.handleLogout}"
              class="${tw('text-sm text-red-600 hover:text-red-800')}"
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
