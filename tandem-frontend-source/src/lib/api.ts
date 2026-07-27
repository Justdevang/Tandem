import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Shared API helper that attaches Firebase auth token to requests using cached token.
 */
export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  let token: string | null = null;
  try {
    if (auth?.currentUser) {
      // Use cached token (false parameter) so API call never blocks on network refresh
      token = await auth.currentUser.getIdToken(false).catch(() => null);
    }
  } catch {
    // Public fallback
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}
