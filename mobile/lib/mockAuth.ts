/**
 * Mock auth for demo/mockup mode – no backend.
 * Use EXPO_PUBLIC_USE_MOCK_AUTH=true in .env to enable.
 */

import { setStoredTokens, getItem, setItem, removeItem } from './storage';

const MOCK_USER_KEY = 'famsync_mock_user';

export type MockUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
};

/** Fake users: email + code → user. Use any of these to "login" in mock mode. */
export const FAKE_USERS: { email: string; code: string; user: MockUser }[] = [
  {
    email: 'demo@famsync.app',
    code: '123456',
    user: {
      id: 1,
      email: 'demo@famsync.app',
      first_name: 'Demo',
      last_name: 'User',
      is_verified: true,
    },
  },
  {
    email: 'test@famsync.app',
    code: '654321',
    user: {
      id: 2,
      email: 'test@famsync.app',
      first_name: 'Test',
      last_name: 'User',
      is_verified: true,
    },
  },
  {
    email: 'ana@famsync.app',
    code: '111111',
    user: {
      id: 3,
      email: 'ana@famsync.app',
      first_name: 'Ana',
      last_name: 'García',
      is_verified: true,
    },
  },
  {
    email: 'ctorres@spotynet.com',
    code: '654321',
    user: {
      id: 4,
      email: 'ctorres@spotynet.com',
      first_name: 'C',
      last_name: 'Torres',
      is_verified: true,
    },
  },
];

const MOCK_ACCESS = 'mock_access_token';
const MOCK_REFRESH = 'mock_refresh_token';

export async function getStoredMockUser(): Promise<MockUser | null> {
  const raw = await getItem(MOCK_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

async function setStoredMockUser(user: MockUser): Promise<void> {
  await setItem(MOCK_USER_KEY, JSON.stringify(user));
}

export async function clearStoredMockUser(): Promise<void> {
  await removeItem(MOCK_USER_KEY);
}

export async function mockRequestEmailOTP(_email: string): Promise<void> {
  // No-op: "send" code. In mock mode any email is accepted; user must use a fake code.
}

export async function mockVerifyEmailOTP(
  email: string,
  code: string
): Promise<{
  access: string;
  refresh: string;
  user: MockUser;
}> {
  const entry = FAKE_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.code === code
  );
  if (!entry) {
    throw new Error(
      'Código inválido. En modo demo usa: demo@famsync.app / 123456 o test@famsync.app / 654321 o ana@famsync.app / 111111'
    );
  }
  await setStoredTokens(MOCK_ACCESS, MOCK_REFRESH);
  await setStoredMockUser(entry.user);
  return {
    access: MOCK_ACCESS,
    refresh: MOCK_REFRESH,
    user: entry.user,
  };
}

export async function mockLoginWithGoogle(_idToken: string): Promise<{
  access: string;
  refresh: string;
  user: MockUser;
}> {
  const user = FAKE_USERS[0].user;
  await setStoredTokens(MOCK_ACCESS, MOCK_REFRESH);
  await setStoredMockUser(user);
  return { access: MOCK_ACCESS, refresh: MOCK_REFRESH, user };
}

export async function mockFetchMe(): Promise<MockUser> {
  const user = await getStoredMockUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function mockLogoutApi(): Promise<void> {
  await clearStoredMockUser();
}
