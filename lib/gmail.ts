export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  isUnread: boolean;
  labelIds: string[];
}

// Basic avatar helper used by multiple screens
export function getAvatarUrl(email: string): string {
  const domain = email.split('@')[1];
  if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
    return `https://logo.clearbit.com/${domain}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random&color=fff&size=80`;
}

// Inbox / sent list
export async function fetchGmailMessages(_accessToken: string, _limit: number): Promise<GmailMessage[]> {
  console.warn('[gmail] fetchGmailMessages stub called – returning empty list');
  return [];
}

export async function fetchSentMessages(_accessToken: string, _limit: number): Promise<GmailMessage[]> {
  console.warn('[gmail] fetchSentMessages stub called – returning empty list');
  return [];
}

// Single thread + sending
export async function fetchGmailThread(_accessToken: string, _threadId: string): Promise<GmailMessage[]> {
  console.warn('[gmail] fetchGmailThread stub called – returning empty list');
  return [];
}

export async function sendGmailMessage(
  _accessToken: string,
  _to: string,
  _subject: string,
  _body: string,
  _threadId?: string
): Promise<boolean> {
  console.warn('[gmail] sendGmailMessage stub called – pretending success');
  return true;
}

// Message mutations
export async function deleteGmailMessage(_accessToken: string, _messageId: string): Promise<boolean> {
  console.warn('[gmail] deleteGmailMessage stub called – pretending success');
  return true;
}

export async function archiveGmailMessage(_accessToken: string, _messageId: string): Promise<boolean> {
  console.warn('[gmail] archiveGmailMessage stub called – pretending success');
  return true;
}

export async function starGmailMessage(_accessToken: string, _messageId: string, _star: boolean): Promise<boolean> {
  console.warn('[gmail] starGmailMessage stub called – pretending success');
  return true;
}

export async function markAsRead(_accessToken: string, _messageId: string, _read: boolean): Promise<boolean> {
  console.warn('[gmail] markAsRead stub called – pretending success');
  return true;
}

