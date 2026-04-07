import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const RAZORPAY_WEBHOOK_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

const SUBSCRIPTION_LIMITS: Record<string, number> = {
  pro: 200,
  premium: 500,
  free: 40,
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return Response.json({ success: false, error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    // ─── One-time payment captured ───
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const notes = payment.notes || {};
      const userId = notes.user_id;
      const planType = notes.plan_type;

      if (!userId || !planType) {
        return Response.json({ success: false, error: 'Missing required data' }, { status: 400 });
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        subscription_type: planType,
        status: 'active',
        payment_id: payment.id,
        order_id: payment.order_id,
        amount_paid: payment.amount / 100,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, message: 'Subscription activated' });
    }

    // ─── Recurring subscription charged successfully ───
    if (event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;
      const notes = subscription.notes || {};
      const userId = notes.user_id;
      const planType = notes.plan_type;

      if (!userId || !planType) {
        return Response.json({ success: false, error: 'Missing user_id or plan_type' }, { status: 400 });
      }

      const applicationsLimit = SUBSCRIPTION_LIMITS[planType] || 0;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Get current remaining swipes
      const { data: profile } = await supabase
        .from('profiles')
        .select('applications_remaining')
        .eq('id', userId)
        .single();

      const currentRemaining = profile?.applications_remaining || 0;

      // Add new monthly quota on top of remaining swipes
      await supabase
        .from('profiles')
        .update({
          subscription_type: planType,
          subscription_end_date: endDate.toISOString(),
          applications_remaining: currentRemaining + applicationsLimit,
          applications_limit: applicationsLimit,
          last_reset_date: new Date().toISOString(),
          subscription_status: 'active',
          razorpay_subscription_id: subscription.id,
        })
        .eq('id', userId);

      // Record transaction
      await supabase.from('payment_history').insert({
        user_id: userId,
        subscription_type: planType,
        amount: payment.amount / 100,
        payment_id: payment.id,
        order_id: subscription.id,
        status: 'completed',
      });

      return Response.json({ success: true, message: 'Subscription renewed' });
    }

    // ─── Subscription payment failed / halted ───
    if (event.event === 'subscription.halted' || event.event === 'payment.failed') {
      const subscription = event.payload.subscription?.entity;
      const payment = event.payload.payment?.entity;
      const notes = subscription?.notes || payment?.notes || {};
      const userId = notes.user_id;

      if (!userId) {
        return Response.json({ success: true, message: 'No user_id, skipping' });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('applications_remaining, subscription_type')
        .eq('id', userId)
        .single();

      const currentRemaining = profile?.applications_remaining || 0;
      const freeAllowance = SUBSCRIPTION_LIMITS.free;

      // Downgrade to free, retain remaining swipes + free allowance
      await supabase
        .from('profiles')
        .update({
          subscription_type: 'free',
          subscription_status: 'payment_failed',
          applications_remaining: currentRemaining + freeAllowance,
          applications_limit: freeAllowance,
          razorpay_subscription_id: null,
        })
        .eq('id', userId);

      // Record failed transaction
      await supabase.from('payment_history').insert({
        user_id: userId,
        subscription_type: profile?.subscription_type || 'unknown',
        amount: (payment?.amount || 0) / 100,
        payment_id: payment?.id || null,
        order_id: subscription?.id || null,
        status: 'failed',
      });

      return Response.json({ success: true, message: 'User downgraded due to payment failure' });
    }

    // ─── Subscription cancelled ───
    if (event.event === 'subscription.cancelled') {
      const subscription = event.payload.subscription.entity;
      const notes = subscription.notes || {};
      const userId = notes.user_id;

      if (userId) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);
      }

      return Response.json({ success: true, message: 'Subscription marked cancelled' });
    }

    return Response.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.log('Webhook error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
