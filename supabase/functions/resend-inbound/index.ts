import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

async function fetchEmailContent(emailId: string, apiKey: string): Promise<{ text: string; html: string }> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      console.log('[resend-inbound] Failed to fetch email content:', res.status)
      return { text: '', html: '' }
    }
    const data = await res.json()
    return { text: data.text || '', html: data.html || '' }
  } catch (e) {
    console.log('[resend-inbound] Error fetching email content:', e)
    return { text: '', html: '' }
  }
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    const payload = await req.json()
    console.log('[resend-inbound] Webhook payload:', JSON.stringify(payload).slice(0, 500))

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

      // Build a name-based alias if user_name is provided
      const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const rand = Math.random().toString(36).slice(2, 6)
      let alias: string
      if (payload.user_name && typeof payload.user_name === 'string') {
        const parts = payload.user_name.trim().split(/\s+/)
        const first = sanitize(parts[0] || '')
        const last = sanitize(parts.slice(1).join('') || '')
        const namePart = last ? `${first}.${last}` : first
        alias = namePart ? `${namePart}.${rand}@nextquark.in` : `u-${payload.user_id.replace(/-/g, '').slice(0, 8)}-${rand}@nextquark.in`
      } else {
        const short = payload.user_id.replace(/-/g, '').slice(0, 8)
        alias = `u-${short}-${rand}@nextquark.in`
      }

      const { data, error } = await supabase
        .from('proxy_emails')
        .insert({ user_id: payload.user_id, proxy_address: alias })
        .select('proxy_address')
        .single()

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

    // Only process email.received events
    if (payload.type && payload.type !== 'email.received') {
      console.log('[resend-inbound] Ignoring event type:', payload.type)
      return new Response(
        JSON.stringify({ ignored: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle inbound email from Resend webhook
    const emailData = payload.data || payload
    const emailId = emailData.email_id || ''

    let toRaw = ''
    if (Array.isArray(emailData.to)) {
      toRaw = emailData.to[0] || ''
    } else {
      toRaw = emailData.to || ''
    }

    const toEmail = extractEmail(toRaw)
    const fromRaw = emailData.from || ''
    const fromEmail = extractEmail(fromRaw)
    const fromName = extractName(fromRaw)
    const subject = emailData.subject || '(no subject)'

    console.log('[resend-inbound] from:', fromEmail, 'to:', toEmail, 'subject:', subject, 'email_id:', emailId)

    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: proxy, error: proxyError } = await supabase
      .from('proxy_emails')
      .select('user_id')
      .eq('proxy_address', toEmail)
      .single()

    if (proxyError || !proxy) {
      console.log('[resend-inbound] No user for proxy:', toEmail, proxyError?.message)
      return new Response(
        JSON.stringify({ error: 'Unknown recipient' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch email body from Resend API (webhooks don't include body)
    let bodyText = ''
    let bodyHtml = ''
    if (emailId && resendApiKey) {
      const content = await fetchEmailContent(emailId, resendApiKey)
      bodyText = content.text
      bodyHtml = content.html
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
    })

    if (insertError) {
      console.log('[resend-inbound] Insert error:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to store email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[resend-inbound] Stored email for user:', proxy.user_id)
    return new Response(
      JSON.stringify({ success: true }),
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
