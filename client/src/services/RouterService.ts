import type { Route } from '../types.ts';

export class RouterService {
  private static instance?: RouterService;

  private currentRoute: Route | null = null;
  private listeners: Array<(route: Route) => void> = [];

  static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }
  constructor() {
    this.currentRoute = null;
    this.listeners = [];

    globalThis.addEventListener('popstate', () => this.handleRoute());
  }
  init() {
    this.handleRoute();
  }

  handleRoute() {
    const path = globalThis.location.pathname;
    const route = this.parseRoute(path);
    if (route) {
      this.currentRoute = route;
      this.notifyListeners(route);
    } else {
      this.navigateTo('/');
    }
  }

  parseRoute(path: string): Route | null {
    console.log({ path });
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) {
      return { view: 'login' };
    }

    if (segments[0] === 'dashboard' && segments.length === 1) {
      return { view: 'game-list' };
    }

    if (segments[0] === 'game' && segments[1] && segments.length === 2) {
      return { view: 'game', gameId: segments[1] };
    }
    return null;
  }

  navigateTo(path: string) {
    globalThis.history.pushState({}, '', path);
    this.handleRoute();
  }

  // Subscribe to route changes
  subscribe(callback: (route: Route) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notifyListeners(route: Route) {
    this.listeners.forEach((callback) => callback(route));
  }
}
