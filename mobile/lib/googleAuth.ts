import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth - get ID token for backend verification.
 * Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env (Web Client ID from Google Cloud Console).
 * Note: For Expo Go, add the redirect URL to Google Cloud Console:
 *   exp://127.0.0.1:8081/--/auth (dev)
 */
const GOOGLE_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID as string) || '';

export async function signInWithGoogle(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'Google Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env'
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'famsync',
    path: 'auth',
  });

  const nonce = Math.random().toString(36).substring(2);
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    redirectUri
  );

  if (result.type === 'success' && result.url) {
    const fragment = result.url.split('#')[1];
    if (fragment) {
      const params = new URLSearchParams(fragment);
      const idToken = params.get('id_token');
      return idToken;
    }
  }

  return null;
}
