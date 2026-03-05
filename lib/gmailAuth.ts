import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

const GMAIL_TOKEN_KEY = 'gmail_access_token';
const GMAIL_REFRESH_TOKEN_KEY = 'gmail_refresh_token';
const GMAIL_TOKEN_EXPIRY_KEY = 'gmail_token_expiry';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export const useGmailAuth = () => {
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
      redirectUri,
    },
    discovery
  );

  return { request, response, promptAsync, redirectUri };
};

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
  try {
    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenResponse.json();
    if (tokens.access_token) {
      await AsyncStorage.setItem(GMAIL_TOKEN_KEY, tokens.access_token);
      if (tokens.refresh_token) {
        await AsyncStorage.setItem(GMAIL_REFRESH_TOKEN_KEY, tokens.refresh_token);
      }
      if (tokens.expires_in) {
        const expiry = Date.now() + tokens.expires_in * 1000;
        await AsyncStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, expiry.toString());
      }
      return tokens.access_token;
    }
    return null;
  } catch (error) {
    console.log('Token exchange error:', error);
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(GMAIL_TOKEN_KEY);
  const expiry = await AsyncStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);

  if (!token) return null;

  if (expiry && Date.now() >= parseInt(expiry, 10)) {
    return await refreshAccessToken();
  }

  return token;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokens = await tokenResponse.json();
    if (tokens.access_token) {
      await AsyncStorage.setItem(GMAIL_TOKEN_KEY, tokens.access_token);
      if (tokens.expires_in) {
        const expiry = Date.now() + tokens.expires_in * 1000;
        await AsyncStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, expiry.toString());
      }
      return tokens.access_token;
    }
    return null;
  } catch (error) {
    console.log('Token refresh error:', error);
    return null;
  }
}

export async function revokeGmailAccess(): Promise<void> {
  const token = await AsyncStorage.getItem(GMAIL_TOKEN_KEY);
  if (token) {
    try {
      await fetch(`${discovery.revocationEndpoint}?token=${token}`, { method: 'POST' });
    } catch (error) {
      console.log('Token revocation error:', error);
    }
  }
  await AsyncStorage.multiRemove([GMAIL_TOKEN_KEY, GMAIL_REFRESH_TOKEN_KEY, GMAIL_TOKEN_EXPIRY_KEY]);
}
