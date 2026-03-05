/**
 * API base URL - set EXPO_PUBLIC_API_URL in .env:
 * - iOS Simulator: http://localhost:8001
 * - Android Emulator: http://10.0.2.2:8001
 * - Physical device: http://YOUR_DEVICE_IP:8001
 */
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) || 'http://localhost:8001';

/** When true, use fake users and hardcoded codes (no backend). */
export const USE_MOCK_AUTH =
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';
