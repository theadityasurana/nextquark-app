const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  labelIds: string[];
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  isUnread: boolean;
  date: string;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

interface GmailHeader {
  name: string;
  value: string;
}

function getHeader(headers: GmailHeader[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function parseNameAndEmail(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].trim() };
  }
  return { name: raw, email: raw };
}

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    try {
      return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

function extractBody(payload: any): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    const textPart = payload.parts.find(
      (p: any) => p.mimeType === 'text/plain' && p.body?.data
    );
    if (textPart) {
      return decodeBase64Url(textPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (p: any) => p.mimeType === 'text/html' && p.body?.data
    );
    if (htmlPart) {
      const html = decodeBase64Url(htmlPart.body.data);
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
}

function formatEmailDate(internalDate: string): string {
  const date = new Date(parseInt(internalDate, 10));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (date.getFullYear() === now.getFullYear()) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseGmailMessage(raw: any): GmailMessage {
  const headers: GmailHeader[] = raw.payload?.headers || [];
  const fromRaw = getHeader(headers, 'From');
  const toRaw = getHeader(headers, 'To');
  const { name: fromName, email: fromEmail } = parseNameAndEmail(fromRaw);
  const { name: toName, email: toEmail } = parseNameAndEmail(toRaw);

  return {
    id: raw.id,
    threadId: raw.threadId,
    snippet: raw.snippet || '',
    internalDate: raw.internalDate || '0',
    labelIds: raw.labelIds || [],
    from: fromName,
    fromEmail,
    to: toName,
    toEmail,
    subject: getHeader(headers, 'Subject') || '(no subject)',
    body: extractBody(raw.payload || {}),
    isUnread: (raw.labelIds || []).includes('UNREAD'),
    date: formatEmailDate(raw.internalDate || '0'),
  };
}

export async function fetchGmailMessages(
  accessToken: string,
  maxResults: number = 30,
  query: string = ''
): Promise<GmailMessage[]> {
  try {
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      labelIds: 'INBOX',
    });
    if (query) {
      params.set('q', query);
    }

    console.log('Fetching Gmail messages list...');
    const listRes = await fetch(`${GMAIL_API_BASE}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.log('Gmail list error:', listRes.status, errText);
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData = await listRes.json();
    const messageIds: { id: string }[] = listData.messages || [];

    if (messageIds.length === 0) {
      console.log('No Gmail messages found');
      return [];
    }

    console.log(`Fetching ${messageIds.length} Gmail message details...`);

    const batchSize = 10;
    const allMessages: GmailMessage[] = [];

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const details = await Promise.all(
        batch.map(async (msg) => {
          const res = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            console.log(`Failed to fetch message ${msg.id}:`, res.status);
            return null;
          }
          return res.json();
        })
      );

      for (const raw of details) {
        if (raw) {
          allMessages.push(parseGmailMessage(raw));
        }
      }
    }

    console.log(`Fetched ${allMessages.length} Gmail messages successfully`);
    return allMessages;
  } catch (error) {
    console.log('fetchGmailMessages error:', error);
    throw error;
  }
}

export async function fetchGmailThread(
  accessToken: string,
  threadId: string
): Promise<GmailMessage[]> {
  try {
    console.log('Fetching Gmail thread:', threadId);
    const res = await fetch(`${GMAIL_API_BASE}/threads/${threadId}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log('Gmail thread error:', res.status, errText);
      throw new Error(`Gmail thread API error: ${res.status}`);
    }

    const data = await res.json();
    const messages: GmailMessage[] = (data.messages || []).map(parseGmailMessage);
    console.log(`Fetched ${messages.length} messages in thread`);
    return messages;
  } catch (error) {
    console.log('fetchGmailThread error:', error);
    throw error;
  }
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string
): Promise<boolean> {
  try {
    let raw = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n`;
    if (inReplyTo) {
      raw += `In-Reply-To: ${inReplyTo}\r\nReferences: ${inReplyTo}\r\n`;
    }
    raw += `\r\n${body}`;

    const encoded = btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendBody: any = { raw: encoded };
    if (threadId) {
      sendBody.threadId = threadId;
    }

    console.log('Sending Gmail message...');
    const res = await fetch(`${GMAIL_API_BASE}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log('Gmail send error:', res.status, errText);
      return false;
    }

    console.log('Gmail message sent successfully');
    return true;
  } catch (error) {
    console.log('sendGmailMessage error:', error);
    return false;
  }
}

export async function deleteGmailMessage(accessToken: string, messageId: string): Promise<boolean> {
  try {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/trash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch (error) {
    console.log('deleteGmailMessage error:', error);
    return false;
  }
}

export async function archiveGmailMessage(accessToken: string, messageId: string): Promise<boolean> {
  try {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
    });
    return res.ok;
  } catch (error) {
    console.log('archiveGmailMessage error:', error);
    return false;
  }
}

export async function starGmailMessage(accessToken: string, messageId: string, star: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(star ? { addLabelIds: ['STARRED'] } : { removeLabelIds: ['STARRED'] }),
    });
    return res.ok;
  } catch (error) {
    console.log('starGmailMessage error:', error);
    return false;
  }
}

export async function markAsRead(accessToken: string, messageId: string, read: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(read ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] }),
    });
    return res.ok;
  } catch (error) {
    console.log('markAsRead error:', error);
    return false;
  }
}

export async function fetchSentMessages(accessToken: string, maxResults: number = 30): Promise<GmailMessage[]> {
  try {
    const params = new URLSearchParams({ maxResults: maxResults.toString(), labelIds: 'SENT' });
    const listRes = await fetch(`${GMAIL_API_BASE}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const messageIds: { id: string }[] = listData.messages || [];
    if (messageIds.length === 0) return [];

    const details = await Promise.all(
      messageIds.slice(0, 10).map(async (msg) => {
        const res = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return res.ok ? res.json() : null;
      })
    );
    return details.filter(Boolean).map(parseGmailMessage);
  } catch (error) {
    console.log('fetchSentMessages error:', error);
    return [];
  }
}

export function getAvatarUrl(email: string): string {
  const domain = email.split('@')[1];
  if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.') && !domain.includes('hotmail.') && !domain.includes('outlook.')) {
    return `https://logo.clearbit.com/${domain}`;
  }
  const hash = email.toLowerCase().trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(hash)}&background=random&color=fff&size=80`;
}
