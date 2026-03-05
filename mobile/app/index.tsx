import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { getItem } from '../lib/storage';
import { ONBOARDING_DONE_KEY } from './onboarding';

/**
 * Root index: decides where to send the user.
 *   - Onboarding not done → /onboarding
 *   - Onboarding done, not authenticated → /login
 *   - Authenticated, setup not done → /setup/rol-color
 *   - Authenticated, setup done → /(tabs)
 *
 */
export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      // 1. Must be authenticated first
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }
      // 2. Authenticated but onboarding not done yet
      const onboardingDone = await getItem(ONBOARDING_DONE_KEY);
      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }
      // 3. All done → home
      router.replace('/(tabs)');
    })();
  }, [isLoading, isAuthenticated]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#34C759" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
