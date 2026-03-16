import { useMemo } from 'react';

type GmailAuthResponse =
  | null
  | {
      type: 'success' | 'error' | 'cancel';
      params: { code?: string; [key: string]: any };
    };

export function useGmailAuth() {
  // Minimal stub that matches the shape the UI expects
  const request = null;
  const response: GmailAuthResponse = null;
  const redirectUri = '';

  const promptAsync = async () => {
    console.warn('[gmailAuth] promptAsync stub called – Gmail OAuth is disabled in this build');
    return { type: 'cancel' as const };
  };

  return useMemo(
    () => ({
      request,
      response,
      promptAsync,
      redirectUri,
    }),
    [request, response, redirectUri]
  );
}

export async function exchangeCodeForToken(_code: string, _redirectUri: string): Promise<string | null> {
  console.warn('[gmailAuth] exchangeCodeForToken stub called – returning null');
  return null;
}

export async function getValidAccessToken(): Promise<string | null> {
  console.warn('[gmailAuth] getValidAccessToken stub called – returning null');
  return null;
}

export async function revokeGmailAccess(): Promise<void> {
  console.warn('[gmailAuth] revokeGmailAccess stub called – no-op');
}

