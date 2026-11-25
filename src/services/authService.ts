import { UserPersona } from '../types/domain';

export interface AuthUser {
  name: string;
  email: string;
  role: UserPersona;
}

export interface AuthStatusResponse {
  initialized: boolean;
  envConfigured: boolean;
  claimedEmailHint: string | null;
}

// Keep Bearer token strictly in JS memory (never localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  inMemoryAccessToken = null;
  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function getAuthHeaders(): Record<string, string> {
  if (!inMemoryAccessToken) return {};
  return { 'X-Session-Token': inMemoryAccessToken };
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const res = await fetch('/api/auth/status', {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error('Unable to reach authentication service.');
  }
  return (await res.json()) as AuthStatusResponse;
}

export async function submitFirstRunSetup(params: {
  name: string;
  email: string;
  role: UserPersona;
  password: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as {
    user?: AuthUser;
    token?: string;
    error?: string;
  };
  if (!res.ok || !data.user || !data.token) {
    throw new Error(data.error || 'Could not complete first-run setup.');
  }
  setAccessToken(data.token);
  return { user: data.user, token: data.token };
}

export async function submitLogin(params: {
  email: string;
  role: UserPersona;
  password: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as {
    user?: AuthUser;
    token?: string;
    error?: string;
  };
  if (!res.ok || !data.user || !data.token) {
    throw new Error(data.error || 'Invalid credentials.');
  }
  setAccessToken(data.token);
  return { user: data.user, token: data.token };
}

export async function logoutSession(): Promise<void> {
  const headers = getAuthHeaders();
  setAccessToken(null);
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
    });
  } catch {
    // Token already cleared from memory
  }
}
