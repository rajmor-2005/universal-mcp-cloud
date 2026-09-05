/**
 * Universal MCP Cloud — API Client
 * Production-ready HTTP client for NestJS backend with JWT auth headers.
 */

function getApiBase(): string {
  const envUrl = (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : null) || 'http://localhost:4000';
  if (envUrl.includes('/api/v1')) return envUrl;
  const baseUrl = envUrl.replace(/\/$/, '');
  return `${baseUrl}/api/v1`;
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('umcp_access_token');
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('umcp_access_token', token);
  } else {
    localStorage.removeItem('umcp_access_token');
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('umcp_refresh_token');
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('umcp_refresh_token', token);
  } else {
    localStorage.removeItem('umcp_refresh_token');
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await response.text().catch(() => '');
  let data: any = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: { message: rawText.length > 200 ? `${rawText.substring(0, 200)}...` : rawText } };
    }
  }

  if (!response.ok) {
    const errorObj = data.error || {};
    throw new ApiError(
      response.status,
      errorObj.code || `HTTP_${response.status}`,
      errorObj.message || `API error (${response.status}): ${response.statusText}`,
      errorObj.details,
    );
  }

  return (data.data !== undefined ? data.data : data) as T;
}
