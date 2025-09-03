export const login = async (email: string): Promise<string> => {
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
      errorMessage += `: ${response.statusText}`;

      // Try to get error details from response body
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch {
        // Ignore JSON parsing errors
      }

      throw new Error(errorMessage);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    // Re-throw other errors (including our custom HTTP errors)
    throw error;
  }
};

const checkResult = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 401) {
      globalThis.dispatchEvent(
        new CustomEvent<string>('auth-error', {
          bubbles: true,
        }),
      );
    }
    const body = await res.json();
    const errorMessage = body.error || 'Unknown Error';
    globalThis.dispatchEvent(
      new CustomEvent<string>('app-error', {
        detail: errorMessage,
        bubbles: true,
      }),
    );
    return false;
  }
  return true;
};

export const getApi = async (path: string) => {
  const getResponse = await fetch(path);
  if (await checkResult(getResponse)) {
    return await getResponse.json();
  }
  return null;
};
