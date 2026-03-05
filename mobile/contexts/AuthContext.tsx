import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { router } from 'expo-router';
import {
  getStoredTokens,
  clearStoredTokens,
  loginWithGoogle,
  requestEmailOTP,
  verifyEmailOTP,
  logoutApi,
  fetchMe,
} from '../lib/api';
import { removeItem, SETUP_DONE_KEY } from '../lib/storage';
import { ONBOARDING_DONE_KEY } from '../app/onboarding';

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
  loginWithGoogle: (idToken: string) => Promise<void>;
  requestEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    const { access } = await getStoredTokens();
    if (!access) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await fetchMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      await clearStoredTokens();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLoginWithGoogle = useCallback(async (idToken: string) => {
    const data = await loginWithGoogle(idToken);
    await removeItem(ONBOARDING_DONE_KEY);
    await removeItem(SETUP_DONE_KEY);
    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
    router.replace('/');
  }, []);

  const handleRequestEmailOTP = useCallback(async (email: string) => {
    await requestEmailOTP(email);
  }, []);

  const handleVerifyEmailOTP = useCallback(async (email: string, code: string) => {
    const data = await verifyEmailOTP(email, code);
    await removeItem(ONBOARDING_DONE_KEY);
    await removeItem(SETUP_DONE_KEY);
    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
    router.replace('/');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const { refresh } = await getStoredTokens();
      if (refresh) {
        try {
          await logoutApi(refresh);
        } catch {
          // Ignore logout API errors
        }
      }
    } finally {
      await clearStoredTokens();
      await removeItem(ONBOARDING_DONE_KEY);
      await removeItem(SETUP_DONE_KEY);
      setState({ user: null, isLoading: false, isAuthenticated: false });
      router.replace('/');
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    loginWithGoogle: handleLoginWithGoogle,
    requestEmailOTP: handleRequestEmailOTP,
    verifyEmailOTP: handleVerifyEmailOTP,
    logout: handleLogout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
