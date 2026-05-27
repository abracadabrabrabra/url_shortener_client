const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.error('VITE_API_URL is not defined! Check your .env file');
}

console.log('API_BASE_URL:', API_BASE_URL);

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.entries(existingHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });
    }

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (options.headers) {
          const existingHeaders = options.headers as Record<string, string>;
          Object.entries(existingHeaders).forEach(([key, value]) => {
            retryHeaders[key] = value;
          });
        }

        const newToken = this.getAccessToken();
        if (newToken) {
          retryHeaders['Authorization'] = `Bearer ${newToken}`;
        }

        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAccessToken(data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      }
    } catch (e) {
      console.error('Refresh failed:', e);
    }

    this.logout(refreshToken);
    return false;
  }

  private clearAuth() {
    this.setAccessToken(null);
    localStorage.removeItem('refresh_token');
  }

  async logout(refreshToken: string) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    this.clearAuth();
  }

  logoutSilent() {
    this.clearAuth();
  }

  async logoutAll() {
    await this.request('/auth/logout-all', { method: 'POST' });
    this.clearAuth();
  }

  async register(email: string, password: string) {
    return this.request<{ user_id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.setAccessToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  async createShorten(originalUrl: string, protected_: boolean = false) {
    const endpoint = protected_ ? '/shorten/protected' : '/shorten';
    return this.request<{
      original_url: string;
      short_code: string;
      short_url: string;
      user_id?: number;
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ original_url: originalUrl }),
    });
  }

}

export const apiClient = new ApiClient();