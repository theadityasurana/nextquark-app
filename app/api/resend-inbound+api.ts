import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://widujxpahzlpegzjjpqp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.EXPO_PUBLIC_RESEND_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchEmailContent(emailId: string): Promise<{ text: string; html: string }> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (!res.ok) return { text: '', html: '' };
    const data = await res.json();
    return { text: data.text || '', html: data.html || '' };
  } catch {
    return { text: '', html: '' };
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[resend-inbound] Received webhook payload:', JSON.stringify(payload).slice(0, 500));

    // Only process email.received events
    if (payload.type && payload.type !== 'email.received') {
      return Response.json({ ignored: true });
    }

    const emailData = payload.data || payload;
    const emailId = emailData.email_id || '';

    let toEmail = '';
    if (Array.isArray(emailData.to)) {
      toEmail = emailData.to[0] || '';
    } else if (typeof emailData.to === 'string') {
      toEmail = emailData.to;
    }

    const emailMatch = toEmail.match(/<(.+?)>/);
    if (emailMatch) toEmail = emailMatch[1];
    toEmail = toEmail.trim().toLowerCase();

    let fromEmail = emailData.from || '';
    const fromMatch = fromEmail.match(/<(.+?)>/);
    const fromName = fromMatch ? fromEmail.split('<')[0].trim() : fromEmail.split('@')[0];
    if (fromMatch) fromEmail = fromMatch[1];
    fromEmail = fromEmail.trim().toLowerCase();

    const subject = emailData.subject || '(no subject)';

    console.log('[resend-inbound] from:', fromEmail, 'to:', toEmail, 'subject:', subject, 'email_id:', emailId);

    if (!toEmail) {
      return Response.json({ error: 'Missing recipient' }, { status: 400 });
    }

    const { data: proxy, error: proxyError } = await supabase
      .from('proxy_emails')
      .select('user_id')
      .eq('proxy_address', toEmail)
      .single();

    if (proxyError || !proxy) {
      console.log('[resend-inbound] No user found for proxy address:', toEmail);
      return Response.json({ error: 'Unknown recipient' }, { status: 404 });
    }

    // Fetch email body from Resend API (webhooks don't include body)
    let bodyText = '';
    let bodyHtml = '';
    if (emailId && RESEND_API_KEY) {
      const content = await fetchEmailContent(emailId);
      bodyText = content.text;
      bodyHtml = content.html;
    }

    const { error: insertError } = await supabase.from('inbound_emails').insert({
      user_id: proxy.user_id,
      proxy_address: toEmail,
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
    });

    if (insertError) {
      console.log('[resend-inbound] Error storing inbound email:', insertError.message);
      return Response.json({ error: 'Failed to store email' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.log('[resend-inbound] Webhook error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
