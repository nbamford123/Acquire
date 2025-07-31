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
    try {
      // Use relative path or fallback to localhost for development
      const response = await fetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        let errorMessage = `Login failed (${response.status})`;

        // Add status text for common HTTP errors
        switch (response.status) {
          case 400:
            errorMessage += ': Bad Request - Invalid email format';
            break;
          case 401:
            errorMessage += ': Unauthorized - Invalid credentials';
            break;
          case 403:
            errorMessage += ': Forbidden - Access denied';
            break;
          case 404:
            errorMessage += ': Not Found - Login endpoint not found';
            break;
          case 405:
            errorMessage += ': Method Not Allowed - Check server configuration';
            break;
          case 500:
            errorMessage += ': Internal Server Error';
            break;
          default:
            errorMessage += `: ${response.statusText}`;
        }

        // Try to get error details from response body
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage += ` - ${errorData.message}`;
          }
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      const userData = await response.json();
      this.user = userData;
      return userData;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }
      // Re-throw other errors (including our custom HTTP errors)
      throw error;
    }
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
