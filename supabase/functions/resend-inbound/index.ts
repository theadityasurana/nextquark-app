import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

function extractEmail(raw: string): string {
  if (!raw) return ''
  const match = raw.match(/<(.+?)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

function extractName(raw: string): string {
  if (!raw) return ''
  const match = raw.match(/^(.+?)\s*</)
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : raw.split('@')[0]
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

    const rawBody = await req.text()
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle proxy email creation requests from the app
    if (payload.action === 'create-proxy' && payload.user_id) {
      const { data: existing } = await supabase
        .from('proxy_emails')
        .select('proxy_address')
        .eq('user_id', payload.user_id)
        .single()

      if (existing?.proxy_address) {
        return new Response(
          JSON.stringify({ proxy_address: existing.proxy_address }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      let baseName = ''
      if (payload.user_name && typeof payload.user_name === 'string') {
        const parts = payload.user_name.trim().split(/\s+/)
        const first = sanitize(parts[0] || '')
        const last = sanitize(parts.slice(1).join('') || '')
        baseName = last ? `${first}.${last}` : first
      }

      if (!baseName) {
        const short = payload.user_id.replace(/-/g, '').slice(0, 8)
        baseName = `u-${short}`
      }

      // Try clean email first, then add suffix on conflict
      let alias = `${baseName}@nextquark.in`
      let { data, error } = await supabase
        .from('proxy_emails')
        .insert({ user_id: payload.user_id, proxy_address: alias })
        .select('proxy_address')
        .single()

      if (error) {
        const rand = Math.random().toString(36).slice(2, 6)
        alias = `${baseName}.${rand}@nextquark.in`
        ;({ data, error } = await supabase
          .from('proxy_emails')
          .insert({ user_id: payload.user_id, proxy_address: alias })
          .select('proxy_address')
          .single())
      }

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ proxy_address: data?.proxy_address }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ignore non-email.received events
    if (payload.type && payload.type !== 'email.received') {
      return new Response(
        JSON.stringify({ ignored: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Handle inbound email from Resend webhook ---
    // Resend webhooks only include metadata (no body).
    // We must call GET /emails/receiving/{email_id} to fetch the body.
    const emailData = payload.data || payload

    const emailId = emailData.email_id || ''
    const messageId = emailData.message_id || ''
    const fromRaw = emailData.from || ''
    const fromEmail = extractEmail(fromRaw)
    const fromName = extractName(fromRaw)
    const subject = emailData.subject || '(no subject)'

    let toRaw = ''
    if (Array.isArray(emailData.to)) {
      toRaw = emailData.to[0] || ''
    } else {
      toRaw = emailData.to || ''
    }
    const toEmail = extractEmail(toRaw)

    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up the user for this proxy address
    const { data: proxy, error: proxyError } = await supabase
      .from('proxy_emails')
      .select('user_id, forward_to_email')
      .eq('proxy_address', toEmail)
      .single()

    if (proxyError || !proxy) {
      return new Response(
        JSON.stringify({ error: 'Unknown recipient' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the full email content (body) from Resend Receiving API
    let bodyText = ''
    let bodyHtml = ''

    if (emailId && RESEND_API_KEY) {
      try {
        const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
        })
        if (res.ok) {
          const full = await res.json()
          bodyText = full.text || ''
          bodyHtml = full.html || ''
        } else {
          console.error('[resend-inbound] Failed to fetch email content:', res.status, await res.text())
        }
      } catch (fetchErr) {
        console.error('[resend-inbound] Error fetching email content:', fetchErr)
      }
    }

    // Store in Supabase
    const threadId = (subject || '(no subject)').replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim().toLowerCase()
    const { data: insertData, error: insertError } = await supabase.from('inbound_emails').insert({
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
    }).select('id')

    if (insertError) {
      console.error('[resend-inbound] Insert error:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to store email', detail: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auto-forward if user has forwarding enabled
    if (proxy.forward_to_email && RESEND_API_KEY) {
      try {
        const fwdFrom = `NextQuark Mail <noreply@nextquark.in>`
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fwdFrom,
            to: [proxy.forward_to_email],
            subject: `Fwd: ${subject}`,
            ...(bodyHtml ? { html: bodyHtml } : {}),
            text: bodyText || '(no content)',
            reply_to: fromEmail,
          }),
        })
      } catch (fwdErr) {
        console.error('[resend-inbound] Auto-forward error:', fwdErr)
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: insertData?.[0]?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[resend-inbound] Error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
