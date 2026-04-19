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

const SUBSCRIPTION_NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED',
}

// Verify the Pub/Sub push message came from Google by checking the bearer token
function verifyPubSubAuth(req: Request): boolean {
  const expectedToken = Deno.env.get('GOOGLE_PUBSUB_VERIFICATION_TOKEN')
  if (!expectedToken) {
    // If no token configured, skip verification (log warning)
    console.warn('GOOGLE_PUBSUB_VERIFICATION_TOKEN not set — skipping Pub/Sub auth')
    return true
  }

  // Google sends the token as a query param ?token=... or as Authorization bearer
  const url = new URL(req.url)
  const queryToken = url.searchParams.get('token')
  if (queryToken === expectedToken) return true

  const authHeader = req.headers.get('authorization') || ''
  if (authHeader === `Bearer ${expectedToken}`) return true

  console.error('Google Play webhook: Pub/Sub auth failed')
  return false
}

// Look up user by purchase token in payment_history, then fall back to profiles
async function findUserId(supabase: any, purchaseToken: string): Promise<string | null> {
  // Primary: payment_history.payment_id
  const { data: paymentRecord } = await supabase
    .from('payment_history')
    .select('user_id')
    .eq('payment_id', purchaseToken)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (paymentRecord?.user_id) return paymentRecord.user_id

  // Fallback: profiles.google_play_purchase_token
  const { data: profileRecord } = await supabase
    .from('profiles')
    .select('id')
    .eq('google_play_purchase_token', purchaseToken)
    .limit(1)
    .single()

  if (profileRecord?.id) return profileRecord.id

  return null
}

// Validate subscription purchase with Google Play Developer API
async function validateGooglePlaySubscription(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string
): Promise<boolean> {
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
  if (!serviceAccountKey) {
    console.warn('Google Play receipt validation skipped: GOOGLE_SERVICE_ACCOUNT_KEY not set')
    return true
  }

  try {
    // In production, use the service account to get an OAuth2 token and call
    // androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
    // For now, log and allow — full implementation requires google-auth-library
    console.log(`Google Play validation: ${packageName}/${subscriptionId}/${purchaseToken.slice(0, 20)}...`)
    return true
  } catch (e) {
    console.error('Google Play validation error:', e)
    return true // Don't block on errors
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' } })
  }

  // Verify Pub/Sub authentication
  if (!verifyPubSubAuth(req)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const body = await req.json()
    const message = body.message
    if (!message?.data) {
      return new Response(JSON.stringify({ success: false, error: 'No message data' }), { status: 400 })
    }

    const decoded = JSON.parse(atob(message.data))
    const { subscriptionNotification, oneTimeProductNotification, packageName } = decoded

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ─── Subscription notifications ───
    if (subscriptionNotification) {
      const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification
      const typeName = SUBSCRIPTION_NOTIFICATION_TYPES[notificationType] || 'UNKNOWN'
      const planType = PRODUCT_TO_PLAN[subscriptionId] || 'free'

      console.log(`Google Play RTDN: ${typeName} for ${subscriptionId}`)

      // Validate with Google Play
      await validateGooglePlaySubscription(
        packageName || 'app.rork.hireswipe_v3_clone_ceuofke',
        subscriptionId,
        purchaseToken
      )

      const userId = await findUserId(supabase, purchaseToken)

      if (!userId) {
        console.log('No user found for purchase token', purchaseToken?.slice(0, 20))
        return new Response(JSON.stringify({ success: true, message: 'No matching user' }))
      }

      // SUBSCRIPTION_PURCHASED (type 4) — initial purchase from store
      if (notificationType === 4) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('applications_remaining, subscription_type')
          .eq('id', userId)
          .single()

        const currentRemaining = profile?.applications_remaining || 0
        const applicationsLimit = SUBSCRIPTION_LIMITS[planType] || 0
        const isWeekly = subscriptionId === 'nq_premium_weekly'
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
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: endDate.toISOString(),
            applications_remaining: currentRemaining + applicationsLimit,
            applications_limit: applicationsLimit,
            last_reset_date: new Date().toISOString(),
            subscription_status: 'active',
            google_play_purchase_token: purchaseToken,
          })
          .eq('id', userId)

        // Update existing pending payment record if exists
        const { data: pendingRecord } = await supabase
          .from('payment_history')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .eq('subscription_type', planType)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (pendingRecord?.id) {
          await supabase
            .from('payment_history')
            .update({ status: 'completed', payment_id: purchaseToken })
            .eq('id', pendingRecord.id)
        } else {
          await supabase.from('payment_history').insert({
            user_id: userId,
            subscription_type: planType,
            amount: isWeekly ? 999 : 3599,
            payment_id: purchaseToken,
            order_id: subscriptionId,
            status: 'completed',
          })
        }

        return new Response(JSON.stringify({ success: true, message: 'Purchased' }))
      }

      // RENEWED (type 2) or RECOVERED (type 1)
      if (notificationType === 2 || notificationType === 1) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('applications_remaining')
          .eq('id', userId)
          .single()

        const currentRemaining = profile?.applications_remaining || 0
        const applicationsLimit = SUBSCRIPTION_LIMITS[planType] || 0
        const isWeekly = subscriptionId === 'nq_premium_weekly'
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
            google_play_purchase_token: purchaseToken,
          })
          .eq('id', userId)

        await supabase.from('payment_history').insert({
          user_id: userId,
          subscription_type: planType,
          amount: isWeekly ? 999 : 3599,
          payment_id: purchaseToken,
          order_id: subscriptionId,
          status: 'completed',
        })

        return new Response(JSON.stringify({ success: true, message: 'Renewed' }))
      }

      // CANCELED (type 3)
      if (notificationType === 3) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId)

        return new Response(JSON.stringify({ success: true, message: 'Cancelled' }))
      }

      // RESTARTED (type 7) — user re-subscribed
      if (notificationType === 7) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'active', google_play_purchase_token: purchaseToken })
          .eq('id', userId)

        return new Response(JSON.stringify({ success: true, message: 'Restarted' }))
      }

      // ON_HOLD (type 5) or GRACE_PERIOD (type 6)
      if (notificationType === 5 || notificationType === 6) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'payment_failed' })
          .eq('id', userId)

        return new Response(JSON.stringify({ success: true, message: 'Payment issue' }))
      }

      // EXPIRED (type 13) or REVOKED (type 12)
      if (notificationType === 12 || notificationType === 13) {
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
            google_play_purchase_token: null,
          })
          .eq('id', userId)

        return new Response(JSON.stringify({ success: true, message: 'Expired/Revoked' }))
      }

      // All other types — log and acknowledge
      console.log(`Google Play RTDN: Unhandled type ${notificationType} (${typeName})`)
      return new Response(JSON.stringify({ success: true, message: `Acknowledged: ${typeName}` }))
    }

    // One-time product notifications — no longer supported
    if (oneTimeProductNotification) {
      console.log('Google Play RTDN: One-time product notification (no longer supported)')
      return new Response(JSON.stringify({ success: true, message: 'One-time products deprecated' }))
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed' }))
  } catch (error) {
    console.error('Google Play webhook error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { status: 500 })
  }
})
