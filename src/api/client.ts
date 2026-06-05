import type { Link, LinkAnalytics, UserStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface ApiLinkResponse {
  original_url: string;
  short_code?: string;
  short_key?: string;
  short_url?: string;
  user_id: number | null;
  clicks_count?: number;
  created_at?: string;
  is_active?: boolean;
}

interface ApiCreateLinkResponse {
  original_url: string;
  short_code?: string;
  short_key?: string;
  short_url?: string;
  user_id?: number;
}

interface ApiDeleteLinkResponse {
  msg: string;
  short_key: string;
  is_active: boolean;
  deleted_at: string;
}

interface ApiUpdateLinkResponse {
  old_short_key: string;
  short_key: string;
  short_url?: string;
  original_url: string;
  clicks_count?: number;
  created_at?: string;
  is_active?: boolean;
}

const buildShortUrl = (shortKey: string, shortUrl?: string) => {
  if (shortUrl) return shortUrl;

  try {
    const baseUrl = new URL(API_BASE_URL);
    if (baseUrl.hostname === '0.0.0.0') {
      baseUrl.hostname = 'localhost';
    }
    baseUrl.pathname = `/${shortKey}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl.toString();
  } catch {
    return `/${shortKey}`;
  }
};

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
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
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
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
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
    await this.request('/api/auth/logout-all', { method: 'POST' });
    this.clearAuth();
  }

  async register(email: string, password: string) {
    return this.request<{ user_id: number; email: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
    const endpoint = protected_ ? '/api/shorten/protected' : '/shorten';
    const link = await this.request<ApiCreateLinkResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ original_url: originalUrl }),
    });

    const shortCode = link.short_code || link.short_key || '';

    return {
      original_url: link.original_url,
      short_code: shortCode,
      short_url: buildShortUrl(shortCode, link.short_url),
      user_id: link.user_id,
    };
  }

  async getLinkStats(shortKey: string): Promise<Link> {
    const link = await this.request<ApiLinkResponse>(`/api/links/${shortKey}/stats`);

    return {
      short_key: link.short_key || link.short_code || shortKey,
      original_url: link.original_url,
      short_url: buildShortUrl(link.short_key || link.short_code || shortKey, link.short_url),
      user_id: link.user_id,
      clicks_count: link.clicks_count,
      created_at: link.created_at,
    };
  }

  async getLinkAnalytics(shortKey: string, dateFrom: string, dateTo: string): Promise<LinkAnalytics> {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });

    return this.request<LinkAnalytics>(`/api/links/${shortKey}/analytics?${params.toString()}`);
  }

  getQrCodeUrl(shortKey: string, scale: number = 10): string {
    const params = new URLSearchParams({ scale: scale.toString() });
    return `${API_BASE_URL}/api/qr/${shortKey}?${params.toString()}`;
  }

  async createCustomQr(
    shortKey: string,
    options: {
      darkColor?: string;
      lightColor?: string;
      scale: number;
      logoFile?: File | null;
    }
  ): Promise<Blob> {
    const formData = new FormData();
    if (options.darkColor) formData.append('dark_color', options.darkColor);
    if (options.lightColor) formData.append('light_color', options.lightColor);
    formData.append('scale', options.scale.toString());
    formData.append('use_default_logo', 'false');
    if (options.logoFile) formData.append('logo_file', options.logoFile);

    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/qr/${shortKey}/custom`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  async getUserLinks(skip: number = 0, limit: number = 20, includeInactive: boolean = false): Promise<Link[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      include_inactive: includeInactive.toString(),
    });

    const links = await this.request<ApiLinkResponse[]>(`/api/user/links?${params.toString()}`);

    return links.map((link) => ({
      short_key: link.short_key || link.short_code || '',
      original_url: link.original_url,
      short_url: buildShortUrl(link.short_key || link.short_code || '', link.short_url),
      user_id: link.user_id,
      clicks_count: link.clicks_count,
      created_at: link.created_at,
    }));
  }

  async deleteLink(shortKey: string): Promise<ApiDeleteLinkResponse> {
    return this.request<ApiDeleteLinkResponse>(`/api/links/${shortKey}`, {
      method: 'DELETE',
    });
  }

  async updateShortKey(shortKey: string): Promise<Link> {
    const link = await this.request<ApiUpdateLinkResponse>(`/api/links/${shortKey}`, {
      method: 'PATCH',
    });

    return {
      short_key: link.short_key,
      original_url: link.original_url,
      short_url: buildShortUrl(link.short_key, link.short_url),
      user_id: null,
      clicks_count: link.clicks_count,
      created_at: link.created_at,
    };
  }

  async getUserStats(): Promise<UserStats> {
    return this.request<UserStats>('/api/user/stats');
  }

  async forgotPassword(email: string): Promise<{ msg: string }> {
    return this.request<{ msg: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ msg: string }> {
    return this.request<{ msg: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword }),
    });
  }

}

export const apiClient = new ApiClient();
