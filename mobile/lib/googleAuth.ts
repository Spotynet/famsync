import * as WebBrowser from 'expo-web-browser';
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
} from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth — ID token for backend verification (`POST /api/auth/google/`).
 *
 * Uses the **Web application** OAuth client ID (same as `GOOGLE_CLIENT_ID` on the backend).
 *
 * If you see `redirect_uri_mismatch`, the redirect URI below must be added **exactly**
 * (character-for-character) to Google Cloud Console → APIs & Services → Credentials
 * → your Web client → **Authorized redirect URIs**.
 *
 * In development, check the Metro console for:
 *   [GoogleAuth] redirectUri=...
 * and paste that string into Google Cloud Console.
 *
 * Optional: set `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` in `.env` to force a single URI
 * everywhere (must still match Google Console).
 */
const GOOGLE_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID as string) || '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

function buildRedirectUri(): string {
  const override = (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI as string)?.trim();
  if (override) {
    return override;
  }
  return makeRedirectUri({
    scheme: 'famsync',
    path: 'auth',
    preferLocalhost: true,
  });
}

export async function signInWithGoogle(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'Google Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env'
    );
  }

  const redirectUri = buildRedirectUri();

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      '[GoogleAuth] redirectUri=',
      redirectUri,
      '| Add this exact URI to Google Cloud Console → Web client → Authorized redirect URIs'
    );
  }

  const nonce =
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  const request = new AuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
    extraParams: { nonce },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.params.id_token) {
    return result.params.id_token as string;
  }

  if (result.type === 'error' && result.error) {
    // eslint-disable-next-line no-console
    console.warn('[GoogleAuth]', result.error);
  }

  return null;
}
