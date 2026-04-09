import { API_BASE_URL, USE_MOCK_AUTH } from './constants';
import {
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from './storage';
import {
  mockRequestEmailOTP,
  mockVerifyEmailOTP,
  mockLoginWithGoogle,
  mockFetchMe,
  mockLogoutApi,
} from './mockAuth';

export { getStoredTokens, setStoredTokens, clearStoredTokens };

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await setStoredTokens(data.access, data.refresh ?? refreshToken);
  return data.access;
}

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { access, refresh } = await getStoredTokens();
  let token = access;

  if (token && options.headers && !(options.headers as Record<string, string>).Authorization) {
    (options.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 && refresh) {
    const newAccess = await refreshAccessToken(refresh);
    if (newAccess) {
      (options.headers as Record<string, string>) = {
        ...(options.headers as Record<string, string>),
        Authorization: `Bearer ${newAccess}`,
      };
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
  }

  return res;
}

export const api = {
  async post(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async get(path: string): Promise<Response> {
    return apiFetch(path, { method: 'GET' });
  },

  async patch(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async delete(path: string, body?: unknown): Promise<Response> {
    return apiFetch(path, {
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async postForm(path: string, body: Record<string, string>): Promise<Response> {
    const form = new URLSearchParams(body).toString();
    const { access } = await getStoredTokens();
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (access) headers.Authorization = `Bearer ${access}`;
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: form,
    });
  },
};

export async function loginWithGoogle(idToken: string): Promise<{
  access: string;
  refresh: string;
  user: { id: number; email: string; first_name: string; last_name: string; is_verified: boolean };
}> {
  if (USE_MOCK_AUTH) return mockLoginWithGoogle(idToken);
  const res = await api.post('/api/auth/google/', { id_token: idToken });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Google sign-in failed');
  }
  const data = await res.json();
  await setStoredTokens(data.access, data.refresh);
  return data;
}

export async function requestEmailOTP(email: string): Promise<void> {
  if (USE_MOCK_AUTH) return mockRequestEmailOTP(email);
  const res = await api.post('/api/auth/email/request-otp/', { email });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.email?.[0] || 'Failed to send verification code');
  }
}

export async function verifyEmailOTP(
  email: string,
  code: string
): Promise<{
  access: string;
  refresh: string;
  user: { id: number; email: string; first_name: string; last_name: string; is_verified: boolean };
}> {
  if (USE_MOCK_AUTH) return mockVerifyEmailOTP(email, code);
  const res = await api.post('/api/auth/email/verify-otp/', { email, code });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid or expired verification code');
  }
  const data = await res.json();
  await setStoredTokens(data.access, data.refresh);
  return data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  if (USE_MOCK_AUTH) return mockLogoutApi();
  await api.post('/api/auth/logout/', { refresh: refreshToken });
}

export async function fetchMe(): Promise<{
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
}> {
  if (USE_MOCK_AUTH) return mockFetchMe();
  const res = await api.get('/api/auth/me/');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

/** Must match backend integrations.views MOBILE_SUCCESS_REDIRECT */
export const GOOGLE_CALENDAR_OAUTH_RETURN_URL = 'famsync://calendar-connected';

export type GoogleCalendarStatus = {
  connected: boolean;
  calendar_id: string | null;
  last_sync_at: string | null;
};

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const res = await api.get('/api/integrations/google-calendar/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'No se pudo obtener el estado de Calendar');
  }
  return res.json();
}

export async function connectGoogleCalendar(): Promise<string> {
  const res = await api.post('/api/integrations/google-calendar/connect/', {});
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error || 'Calendar no está configurado en el servidor o no se pudo iniciar la conexión'
    );
  }
  const data = (await res.json()) as { auth_url: string };
  if (!data.auth_url) throw new Error('Respuesta inválida del servidor');
  return data.auth_url;
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const res = await api.delete('/api/integrations/google-calendar/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo desconectar');
  }
}

export async function syncGoogleCalendar(): Promise<void> {
  const res = await api.post('/api/integrations/google-calendar/sync/', {});
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo sincronizar');
  }
}
