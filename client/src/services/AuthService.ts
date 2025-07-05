export class AuthService {
  private static instance: AuthService;
  private user: string | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string): Promise<string> {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const userData = await response.json();
    this.user = userData;
    return userData;
  }

  logout(): void {
    this.user = null;
  }

  getCurrentUser(): string | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }
}
