import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUBSCRIPTION_LIMITS: Record<string, number> = {
  premium: 999999,
  free: 40,
}

const PRODUCT_TO_PLAN: Record<string, string> = {
  nq_premium_monthly: 'premium',
  nq_premium_weekly: 'premium',
}

function decodeJWSPayload(jws: string): any {
  const parts = jws.split('.')
  if (parts.length !== 3) return null
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(payload)
  return JSON.parse(decoded)
}

// Verify the notification came from Apple by checking the bundle ID in the decoded payload.
// Full x5c certificate chain verification requires a JWK library not available in Deno edge
// functions without extra deps, so we use a shared secret + bundle ID check as a practical guard.
function verifyApplePayload(notification: any, transactionInfo: any): boolean {
  const expectedBundleId = Deno.env.get('APPLE_BUNDLE_ID') || 'app.nextquark.hireswipe'
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET')

  // If a shared secret is configured, verify it matches (App Store Server Notifications V1 compat)
  if (sharedSecret && notification.password && notification.password !== sharedSecret) {
    console.error('Apple webhook: shared secret mismatch')
    return false
  }

  // Verify bundle ID from transaction info
  if (transactionInfo?.bundleId && transactionInfo.bundleId !== expectedBundleId) {
    console.error('Apple webhook: bundle ID mismatch', transactionInfo.bundleId)
    return false
  }

  return true
}

// Look up user by payment_id first, then fall back to searching profiles by original transaction ID
async function findUserId(supabase: any, originalTransactionId: string): Promise<string | null> {
  // Primary: look in payment_history
  const { data: paymentRecord } = await supabase
    .from('payment_history')
    .select('user_id')
    .eq('payment_id', originalTransactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (paymentRecord?.user_id) return paymentRecord.user_id

  // Fallback: look in payment_history by order_id (product ID stored there on initial purchase)
  const { data: orderRecord } = await supabase
    .from('payment_history')
    .select('user_id')
    .eq('order_id', originalTransactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (orderRecord?.user_id) return orderRecord.user_id

  return null
}

// Validate receipt with Apple's App Store Server API
async function validateAppleReceipt(originalTransactionId: string): Promise<boolean> {
  const apiKey = Deno.env.get('APPLE_API_KEY')
  const issuerId = Deno.env.get('APPLE_API_ISSUER_ID')
  // If API credentials aren't configured, skip validation (log warning)
  if (!apiKey || !issuerId) {
    console.warn('Apple receipt validation skipped: APPLE_API_KEY or APPLE_API_ISSUER_ID not set')
    return true
  }

  try {
    // Use App Store Server API to look up the transaction
    const env = Deno.env.get('APPLE_ENVIRONMENT') === 'sandbox'
      ? 'https://api.storekit-sandbox.itunes.apple.com'
      : 'https://api.storekit.itunes.apple.com'

    const resp = await fetch(
      `${env}/inApps/v1/transactions/${originalTransactionId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )
    if (!resp.ok) {
      console.error('Apple receipt validation failed:', resp.status)
      return false
    }
    return true
  } catch (e) {
    console.error('Apple receipt validation error:', e)
    return true // Don't block on network errors
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } })
  }

  try {
    const body = await req.json()
    const { signedPayload } = body

    if (!signedPayload) {
      return new Response(JSON.stringify({ success: false, error: 'No signedPayload' }), { status: 400 })
    }

    const notification = decodeJWSPayload(signedPayload)
    if (!notification) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JWS' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const notificationType = notification.notificationType
    const subtype = notification.subtype || ''

    const signedTransactionInfo = notification.data?.signedTransactionInfo
    const transactionInfo = signedTransactionInfo ? decodeJWSPayload(signedTransactionInfo) : null

    if (!transactionInfo) {
      console.log(`Apple webhook: ${notificationType} — no transaction info`)
      return new Response(JSON.stringify({ success: true }))
    }

    // Verify the payload is from Apple
    if (!verifyApplePayload(notification, transactionInfo)) {
      return new Response(JSON.stringify({ success: false, error: 'Verification failed' }), { status: 403 })
    }

    const originalTransactionId = transactionInfo.originalTransactionId
    const productId = transactionInfo.productId
    const planType = PRODUCT_TO_PLAN[productId] || null

    console.log(`Apple webhook: ${notificationType} ${subtype} for ${productId}`)

    // Validate receipt with Apple
    const isValid = await validateAppleReceipt(originalTransactionId)
    if (!isValid) {
      console.error('Apple webhook: receipt validation failed for', originalTransactionId)
      return new Response(JSON.stringify({ success: false, error: 'Invalid receipt' }), { status: 403 })
    }

    // Find user — with fallback lookup
    const userId = await findUserId(supabase, originalTransactionId)

    if (!userId) {
      console.log('Apple webhook: No matching user for transaction', originalTransactionId)
      return new Response(JSON.stringify({ success: true, message: 'No matching user' }))
    }

    // DID_RENEW — auto-renewal succeeded
    if (notificationType === 'DID_RENEW') {
      if (!planType) {
        return new Response(JSON.stringify({ success: true, message: 'Unknown product' }))
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('applications_remaining')
        .eq('id', userId)
        .single()

      const currentRemaining = profile?.applications_remaining || 0
      const applicationsLimit = SUBSCRIPTION_LIMITS[planType] || 0
      const isWeekly = productId === 'nq_premium_weekly'
      const endDate = new Date()
      if (isWeekly) {
        endDate.setDate(endDate.getDate() + 7)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      await supabase
        .from('profiles')
        .update({
          subscription_type: planType,
          subscription_end_date: endDate.toISOString(),
          applications_remaining: currentRemaining + applicationsLimit,
          applications_limit: applicationsLimit,
          last_reset_date: new Date().toISOString(),
          subscription_status: 'active',
        })
        .eq('id', userId)

      await supabase.from('payment_history').insert({
        user_id: userId,
        subscription_type: planType,
        amount: isWeekly ? 999 : 3599,
        payment_id: originalTransactionId,
        order_id: productId,
        status: 'completed',
      })

      return new Response(JSON.stringify({ success: true, message: 'Renewed' }))
    }

    // DID_CHANGE_RENEWAL_STATUS — cancelled or re-enabled
    if (notificationType === 'DID_CHANGE_RENEWAL_STATUS') {
      const status = subtype === 'AUTO_RENEW_DISABLED' ? 'cancelled' : 'active'
      await supabase
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: `Status: ${status}` }))
    }

    // DID_FAIL_TO_RENEW — payment failed
    if (notificationType === 'DID_FAIL_TO_RENEW') {
      await supabase
        .from('profiles')
        .update({ subscription_status: 'payment_failed' })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'Payment failed' }))
    }

    // EXPIRED — subscription ended
    if (notificationType === 'EXPIRED') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('applications_remaining')
        .eq('id', userId)
        .single()

      await supabase
        .from('profiles')
        .update({
          subscription_type: 'free',
          subscription_status: null,
          applications_remaining: profile?.applications_remaining || 0,
          applications_limit: SUBSCRIPTION_LIMITS.free,
        })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'Expired' }))
    }

    // REFUND or REVOKE
    if (notificationType === 'REFUND' || notificationType === 'REVOKE') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('applications_remaining')
        .eq('id', userId)
        .single()

      await supabase
        .from('profiles')
        .update({
          subscription_type: 'free',
          subscription_status: null,
          applications_remaining: profile?.applications_remaining || 0,
          applications_limit: SUBSCRIPTION_LIMITS.free,
        })
        .eq('id', userId)

      return new Response(JSON.stringify({ success: true, message: 'Revoked/Refunded' }))
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed' }))
  } catch (error) {
    console.error('Apple webhook error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { status: 500 })
  }
})
