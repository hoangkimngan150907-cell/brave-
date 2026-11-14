import { auth } from './firebase';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

function isStaticHostingHostname(hostname: string): boolean {
  return (
    hostname.endsWith('.web.app') ||
    hostname.endsWith('.firebaseapp.com') ||
    hostname.endsWith('.github.io')
  );
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (
    typeof window !== 'undefined' &&
    isStaticHostingHostname(window.location.hostname)
  ) {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Please rebuild the frontend with VITE_API_BASE_URL pointing to your Render backend URL.'
    );
  }

  return normalized;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }

  const user = auth.currentUser;
  const headers = new Headers(options.headers || {});

  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    credentials: API_BASE_URL ? 'omit' : 'same-origin',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      throw new Error(
        'Received HTML instead of API JSON. Check VITE_API_BASE_URL points to your Render backend.'
      );
    }
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}
