import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const PROXY_DOMAIN = 'nextquark.in'

function computeThreadId(subject: string | null): string {
  return (subject || '(no subject)').replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim().toLowerCase()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()

    // --- Forward action ---
    if (payload.action === 'forward') {
      const { email_id, user_id, forward_to } = payload
      if (!email_id || !user_id || !forward_to) {
        return new Response(
          JSON.stringify({ error: 'Missing fields for forward' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: email, error: emailErr } = await supabase
        .from('inbound_emails')
        .select('*')
        .eq('id', email_id)
        .eq('user_id', user_id)
        .single()

      if (emailErr || !email) {
        return new Response(
          JSON.stringify({ error: 'Email not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: proxy } = await supabase
        .from('proxy_emails')
        .select('proxy_address')
        .eq('user_id', user_id)
        .single()

      const fromAddr = proxy?.proxy_address || `noreply@${PROXY_DOMAIN}`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `NextQuark Mail <${fromAddr}>`,
          to: [forward_to],
          subject: `Fwd: ${email.subject || '(no subject)'}`,
          ...(email.body_html ? { html: email.body_html } : {}),
          text: email.body_text || '(no content)',
          reply_to: email.from_email,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[send-email] Forward Resend error:', errText)
        return new Response(
          JSON.stringify({ error: 'Failed to forward' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Send / Reply action ---
    const { from, to, subject, body, user_id, is_html, in_reply_to } = payload

    if (!from || !to || !subject || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fromFormatted = from.includes('<') ? from : `NextQuark Mail <${from}>`

    const emailPayload: Record<string, any> = {
      from: fromFormatted,
      to: Array.isArray(to) ? to : [to],
      subject,
    }

    if (is_html) {
      emailPayload.html = body
      emailPayload.text = (body || '').replace(/<[^>]*>/g, '')
    } else {
      emailPayload.text = body || ''
    }

    if (in_reply_to) {
      emailPayload.headers = {
        'In-Reply-To': in_reply_to,
        'References': in_reply_to,
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[send-email] Resend error:', errText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store in sent_emails
    const sentRow: Record<string, any> = {
      user_id,
      from_email: from,
      to_email: Array.isArray(to) ? to[0] : to,
      subject,
      body_text: is_html ? (body || '').replace(/<[^>]*>/g, '') : (body || ''),
      thread_id: computeThreadId(subject),
      in_reply_to: in_reply_to || null,
    }

    const { error: insertErr } = await supabase.from('sent_emails').insert(sentRow)
    if (insertErr) {
      console.error('[send-email] Error storing sent email:', insertErr.message)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[send-email] Error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
