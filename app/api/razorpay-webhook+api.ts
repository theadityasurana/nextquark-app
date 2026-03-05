import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const RAZORPAY_WEBHOOK_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return Response.json({ success: false, error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.log('Invalid webhook signature');
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount / 100; // Convert from paise to rupees
      const notes = payment.notes || {};

      console.log('Payment captured:', { orderId, paymentId, amount, notes });

      // Extract user info from notes
      const userId = notes.user_id;
      const planType = notes.plan_type;
      const billingCycle = notes.billing_cycle;

      if (!userId || !planType) {
        console.log('Missing user_id or plan_type in payment notes');
        return Response.json({ success: false, error: 'Missing required data' }, { status: 400 });
      }

      // Activate subscription in database
      const expiresAt = new Date();
      if (billingCycle === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        subscription_type: planType,
        status: 'active',
        payment_id: paymentId,
        order_id: orderId,
        amount_paid: amount,
        billing_cycle: billingCycle,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log('Error activating subscription:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      console.log('Subscription activated successfully for user:', userId);
      return Response.json({ success: true, message: 'Subscription activated' });
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      console.log('Payment failed:', payment.id);
      // You can add logic here to notify the user or log the failure
    }

    return Response.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.log('Webhook error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
