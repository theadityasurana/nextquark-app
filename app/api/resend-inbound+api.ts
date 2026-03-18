import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  '';
const RESEND_API_KEY =
  process.env.RESEND_API_KEY ||
  process.env.EXPO_PUBLIC_RESEND_API_KEY ||
  '';


const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extractEmailAddr(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/<(.+?)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

function extractName(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/^(.+?)\s*</);
  return m ? m[1].trim().replace(/^"|"$/g, '') : raw.split('@')[0];
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Ignore non-email.received webhook events
    if (payload.type && payload.type !== 'email.received') {
      return Response.json({ ignored: true });
    }

    // Resend webhook: { type: "email.received", data: { email_id, from, to, subject, ... } }
    // Body is NOT included — must fetch via Resend Receiving API.
    const emailData = payload.data || payload;

    const emailId = emailData.email_id || '';
    const messageId = emailData.message_id || '';
    const fromRaw = emailData.from || '';
    const fromEmail = extractEmailAddr(fromRaw);
    const fromName = extractName(fromRaw);
    const subject = emailData.subject || '(no subject)';

    let toRaw = '';
    if (Array.isArray(emailData.to)) {
      toRaw = emailData.to[0] || '';
    } else if (typeof emailData.to === 'string') {
      toRaw = emailData.to;
    }
    const toEmail = extractEmailAddr(toRaw);

    if (!toEmail) {
      return Response.json({ error: 'Missing recipient' }, { status: 400 });
    }

    const { data: proxy, error: proxyError } = await supabase
      .from('proxy_emails')
      .select('user_id')
      .eq('proxy_address', toEmail)
      .single();

    if (proxyError || !proxy) {
      return Response.json({ error: 'Unknown recipient' }, { status: 404 });
    }

    // Fetch full email content from Resend Receiving API
    let bodyText = '';
    let bodyHtml = '';

    if (emailId && RESEND_API_KEY) {
      try {
        const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
        });
        if (res.ok) {
          const full = await res.json();
          bodyText = full.text || '';
          bodyHtml = full.html || '';
        }
      } catch (e) {
        console.log('[resend-inbound] Error fetching email content:', e);
      }
    }

    const threadId = (subject || '(no subject)').replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim().toLowerCase();
    const { error: insertError } = await supabase.from('inbound_emails').insert({
      user_id: proxy.user_id,
      proxy_address: toEmail,
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      message_id: messageId,
      thread_id: threadId,
    });

    if (insertError) {
      return Response.json({ error: 'Failed to store email', detail: insertError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.log('[resend-inbound] Webhook error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
