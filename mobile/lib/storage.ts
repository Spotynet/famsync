/**
 * Token storage using AsyncStorage.
 * expo-secure-store causes "getValueWithKeyAsync is not a function" in Expo Go / web,
 * so we use AsyncStorage which works on all platforms.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'famsync_access_token';
const REFRESH_TOKEN_KEY = 'famsync_refresh_token';

export const SETUP_DONE_KEY = 'famsync_setup_done';

export async function getItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getStoredTokens(): Promise<{
  access: string | null;
  refresh: string | null;
}> {
  const [access, refresh] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  return { access, refresh };
}

export async function setStoredTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, access),
    setItem(REFRESH_TOKEN_KEY, refresh),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
  ]);
}
