import { supabase } from './supabase';

const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY || '';
const PROXY_DOMAIN = 'nextquark.in';
const SUPABASE_FUNCTIONS_URL = 'https://widujxpahzlpegzjjpqp.supabase.co/functions/v1';

export interface InboundEmail {
  id: string;
  user_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  message_id?: string | null;
  thread_id?: string | null;
  is_starred?: boolean;
  is_archived?: boolean;
  is_read?: boolean;
  received_at: string;
}

export interface SentEmail {
  id: string;
  user_id: string;
  from_email: string;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  thread_id?: string | null;
  in_reply_to?: string | null;
  is_starred?: boolean;
  is_archived?: boolean;
  sent_at: string;
}

export function computeThreadId(subject: string | null): string {
  return (subject || '(no subject)').replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim().toLowerCase();
}

const featureCache = {
  table: new Map<string, boolean>(),
  column: new Map<string, boolean>(),
};

function normalizeMaybeBool(v: any): boolean {
  return v === true;
}

async function tableExists(table: string): Promise<boolean> {
  if (featureCache.table.has(table)) return featureCache.table.get(table)!;
  const { error } = await supabase.from(table).select('id').limit(1);
  const ok = !error;
  featureCache.table.set(table, ok);
  return ok;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  if (featureCache.column.has(key)) return featureCache.column.get(key)!;
  const { error } = await supabase.from(table).select(column).limit(1);
  const ok = !error;
  featureCache.column.set(key, ok);
  return ok;
}

export async function getOrCreateProxyEmail(userId: string, userName?: string): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('proxy_emails')
      .select('proxy_address')
      .eq('user_id', userId)
      .single();

    if (existing?.proxy_address) return existing.proxy_address;

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/resend-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-proxy', user_id: userId, user_name: userName }),
    });

    const data = await res.json();
    return data?.proxy_address || null;
  } catch (e) {
    console.log('getOrCreateProxyEmail error:', e);
    return null;
  }
}

export async function fetchInboundEmails(userId: string): Promise<InboundEmail[]> {
  try {
    const { data, error } = await supabase
      .from('inbound_emails')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Error fetching inbound emails:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      ...row,
      is_starred: normalizeMaybeBool(row.is_starred),
      is_archived: normalizeMaybeBool(row.is_archived),
      is_read: normalizeMaybeBool(row.is_read),
    })) as InboundEmail[];
  } catch (e) {
    console.log('fetchInboundEmails error:', e);
    return [];
  }
}

export async function fetchStarredEmails(userId: string): Promise<{ inbound: InboundEmail[]; sent: SentEmail[] }> {
  try {
    const hasInboundStar = await columnExists('inbound_emails', 'is_starred');
    const hasSentTable = await tableExists('sent_emails');
    const hasSentStar = hasSentTable ? await columnExists('sent_emails', 'is_starred') : false;

    const [inboundRes, sentRes] = await Promise.all([
      hasInboundStar
        ? supabase.from('inbound_emails').select('*').eq('user_id', userId).eq('is_starred', true).order('received_at', { ascending: false })
        : supabase.from('inbound_emails').select('*').eq('user_id', userId).order('received_at', { ascending: false }),
      hasSentTable
        ? hasSentStar
          ? supabase.from('sent_emails').select('*').eq('user_id', userId).eq('is_starred', true).order('sent_at', { ascending: false })
          : supabase.from('sent_emails').select('*').eq('user_id', userId).order('sent_at', { ascending: false })
        : ({ data: [], error: null } as any),
    ]);

    if (inboundRes.error) console.log('Error fetching starred inbound emails:', inboundRes.error.message);
    if (sentRes?.error) console.log('Error fetching starred sent emails:', sentRes.error.message);

    const inbound = (inboundRes.data || []).map((row: any) => ({
      ...row,
      is_starred: normalizeMaybeBool(row.is_starred),
      is_archived: normalizeMaybeBool(row.is_archived),
      is_read: normalizeMaybeBool(row.is_read),
    })) as InboundEmail[];
    const sent = ((sentRes?.data as any[]) || []).map((row: any) => ({
      ...row,
      is_starred: normalizeMaybeBool(row.is_starred),
      is_archived: normalizeMaybeBool(row.is_archived),
    })) as SentEmail[];

    return {
      inbound: hasInboundStar ? inbound.filter((x) => x.is_starred) : inbound,
      sent: hasSentStar ? sent.filter((x) => x.is_starred) : sent,
    };
  } catch (e) {
    console.log('fetchStarredEmails error:', e);
    return { inbound: [], sent: [] };
  }
}

export async function fetchSentEmails(userId: string): Promise<SentEmail[]> {
  try {
    const hasSentTable = await tableExists('sent_emails');
    if (!hasSentTable) return [];

    const { data, error } = await supabase
      .from('sent_emails')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Error fetching sent emails:', error.message);
      return [];
    }
    return ((data || []) as any[]).map((row: any) => ({
      ...row,
      is_starred: normalizeMaybeBool(row.is_starred),
      is_archived: normalizeMaybeBool(row.is_archived),
    })) as SentEmail[];
  } catch (e) {
    console.log('fetchSentEmails error:', e);
    return [];
  }
}

export async function sendEmailViaResend(
  from: string,
  to: string,
  subject: string,
  body: string,
  userId: string,
  isHtml: boolean = false,
  inReplyToMessageId?: string
): Promise<boolean> {
  try {
    const fromFormatted = from.includes('<') ? from : `NextQuark Mail <${from}>`;

    const emailPayload: Record<string, any> = {
      from: fromFormatted,
      to: [to],
      subject,
    };
    if (isHtml) {
      emailPayload.html = body;
      emailPayload.text = body.replace(/<[^>]*>/g, '');
    } else {
      emailPayload.text = body;
    }

    // Set threading headers per Resend docs
    if (inReplyToMessageId) {
      emailPayload.headers = {
        'In-Reply-To': inReplyToMessageId,
        'References': inReplyToMessageId,
      };
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log('Resend API error:', res.status, errText);
      return false;
    }

    // Store in sent_emails
    if (await tableExists('sent_emails')) {
      const row: Record<string, any> = {
        user_id: userId,
        from_email: from,
        to_email: to,
        subject,
        body_text: isHtml ? body.replace(/<[^>]*>/g, '') : body,
      };
      if (await columnExists('sent_emails', 'thread_id')) {
        row.thread_id = computeThreadId(subject);
      }
      if (await columnExists('sent_emails', 'in_reply_to')) {
        row.in_reply_to = inReplyToMessageId || null;
      }
      const { error } = await supabase.from('sent_emails').insert(row);
      if (error) console.log('Error inserting sent email:', error.message);
    }

    return true;
  } catch (e) {
    console.log('sendEmailViaResend error:', e);
    return false;
  }
}

export async function toggleStarInbound(emailId: string, starred: boolean): Promise<boolean> {
  if (!(await columnExists('inbound_emails', 'is_starred'))) return false;
  const { error } = await supabase.from('inbound_emails').update({ is_starred: starred }).eq('id', emailId);
  if (error) console.log('toggleStarInbound error:', error.message);
  return !error;
}

export async function toggleStarSent(emailId: string, starred: boolean): Promise<boolean> {
  if (!(await tableExists('sent_emails'))) return false;
  if (!(await columnExists('sent_emails', 'is_starred'))) return false;
  const { error } = await supabase.from('sent_emails').update({ is_starred: starred }).eq('id', emailId);
  if (error) console.log('toggleStarSent error:', error.message);
  return !error;
}

export async function archiveInbound(emailId: string, archived: boolean): Promise<boolean> {
  if (!(await columnExists('inbound_emails', 'is_archived'))) return false;
  const { error } = await supabase.from('inbound_emails').update({ is_archived: archived }).eq('id', emailId);
  if (error) console.log('archiveInbound error:', error.message);
  return !error;
}

export async function archiveSent(emailId: string, archived: boolean): Promise<boolean> {
  if (!(await tableExists('sent_emails'))) return false;
  if (!(await columnExists('sent_emails', 'is_archived'))) return false;
  const { error } = await supabase.from('sent_emails').update({ is_archived: archived }).eq('id', emailId);
  if (error) console.log('archiveSent error:', error.message);
  return !error;
}

export async function markInboundRead(emailId: string, read: boolean): Promise<boolean> {
  if (!(await columnExists('inbound_emails', 'is_read'))) return false;
  const { error } = await supabase.from('inbound_emails').update({ is_read: read }).eq('id', emailId);
  if (error) console.log('markInboundRead error:', error.message);
  return !error;
}

export async function deleteInboundEmail(emailId: string): Promise<boolean> {
  const { error } = await supabase.from('inbound_emails').delete().eq('id', emailId);
  return !error;
}

export async function deleteSentEmail(emailId: string): Promise<boolean> {
  if (!(await tableExists('sent_emails'))) return false;
  const { error } = await supabase.from('sent_emails').delete().eq('id', emailId);
  return !error;
}

export async function fetchThreadMessages(userId: string, threadId: string): Promise<Array<(InboundEmail | SentEmail) & { _kind: 'inbound' | 'sent' }>> {
  const messages: Array<(InboundEmail | SentEmail) & { _kind: 'inbound' | 'sent' }> = [];
  try {
    const hasThreadCol = await columnExists('inbound_emails', 'thread_id');
    const hasSentTable = await tableExists('sent_emails');
    const hasSentThread = hasSentTable ? await columnExists('sent_emails', 'thread_id') : false;

    const [inboundRes, sentRes] = await Promise.all([
      hasThreadCol
        ? supabase.from('inbound_emails').select('*').eq('user_id', userId).eq('thread_id', threadId).order('received_at', { ascending: true })
        : supabase.from('inbound_emails').select('*').eq('user_id', userId).order('received_at', { ascending: true }),
      hasSentThread
        ? supabase.from('sent_emails').select('*').eq('user_id', userId).eq('thread_id', threadId).order('sent_at', { ascending: true })
        : hasSentTable
          ? supabase.from('sent_emails').select('*').eq('user_id', userId).order('sent_at', { ascending: true })
          : { data: [], error: null } as any,
    ]);

    for (const row of (inboundRes.data || [])) {
      const normalized = computeThreadId(row.subject);
      if (!hasThreadCol && normalized !== threadId) continue;
      messages.push({ ...row, is_starred: normalizeMaybeBool(row.is_starred), is_archived: normalizeMaybeBool(row.is_archived), is_read: normalizeMaybeBool(row.is_read), _kind: 'inbound' });
    }
    for (const row of (sentRes.data || [])) {
      const normalized = computeThreadId(row.subject);
      if (!hasSentThread && normalized !== threadId) continue;
      messages.push({ ...row, is_starred: normalizeMaybeBool(row.is_starred), is_archived: normalizeMaybeBool(row.is_archived), _kind: 'sent' });
    }

    messages.sort((a, b) => {
      const aDate = '_kind' in a && a._kind === 'inbound' ? (a as InboundEmail).received_at : (a as SentEmail).sent_at;
      const bDate = '_kind' in b && b._kind === 'inbound' ? (b as InboundEmail).received_at : (b as SentEmail).sent_at;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  } catch (e) {
    console.log('fetchThreadMessages error:', e);
  }
  return messages;
}

export function subscribeToMailChanges(
  userId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel('nextquark-mail-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inbound_emails', filter: `user_id=eq.${userId}` },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sent_emails', filter: `user_id=eq.${userId}` },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function forwardEmail(
  emailId: string,
  userId: string,
  forwardTo: string
): Promise<boolean> {
  try {
    const { data: email, error } = await supabase
      .from('inbound_emails')
      .select('*')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (error || !email) return false;

    const { data: proxy } = await supabase
      .from('proxy_emails')
      .select('proxy_address')
      .eq('user_id', userId)
      .single();

    const fromAddr = proxy?.proxy_address || `noreply@${PROXY_DOMAIN}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `NextQuark Mail <${fromAddr}>`,
        to: [forwardTo],
        subject: `Fwd: ${email.subject || '(no subject)'}`,
        ...(email.body_html ? { html: email.body_html } : {}),
        text: email.body_text || '(no content)',
        reply_to: email.from_email,
      }),
    });

    return res.ok;
  } catch (e) {
    console.log('forwardEmail error:', e);
    return false;
  }
}

export function getAvatarUrl(email: string): string {
  const domain = email.split('@')[1];
  if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
    return `https://logo.clearbit.com/${domain}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random&color=fff&size=80`;
}
