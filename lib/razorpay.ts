import { Platform, Linking } from 'react-native';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SMzoT0e5YvEGon';
const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || 'Py9XEXKQhScekTPPXOH7xOA5';

const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;

export interface PaymentOptions {
  amount: number;
  planType: 'pro' | 'premium' | 'custom';
  billingCycle: 'monthly' | 'annual' | 'one-time';
  currency?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  userId?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  paymentLinkId?: string;
  subscriptionId?: string;
  shortUrl?: string;
  error?: string;
}

// Razorpay Plan IDs — create these once in Razorpay Dashboard or via API
// Pro: ₹1,999/month, Premium: ₹7,599/month
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  pro: process.env.EXPO_PUBLIC_RAZORPAY_PRO_PLAN_ID || '',
  premium: process.env.EXPO_PUBLIC_RAZORPAY_PREMIUM_PLAN_ID || '',
};

// ─── Razorpay Plan creation (one-time setup helper) ───

export async function ensureRazorpayPlan(planType: 'pro' | 'premium'): Promise<string> {
  const existing = RAZORPAY_PLAN_IDS[planType];
  if (existing) return existing;

  const config = planType === 'pro'
    ? { name: 'Pro Plan', amount: 199900, description: '200 apps/month' }
    : { name: 'Premium Plan', amount: 759900, description: '500 apps/month' };

  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      period: 'monthly',
      interval: 1,
      item: { name: config.name, amount: config.amount, currency: 'INR', description: config.description },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.description || 'Failed to create Razorpay plan');
  }

  const plan = await res.json();
  RAZORPAY_PLAN_IDS[planType] = plan.id;
  return plan.id;
}

// ─── Create Razorpay Subscription ───

export async function createRazorpaySubscription(options: {
  planId: string;
  userId: string;
  planType: string;
  userEmail?: string;
  userName?: string;
  totalCount?: number;
}): Promise<PaymentResult> {
  try {
    const body: any = {
      plan_id: options.planId,
      total_count: options.totalCount || 12,
      quantity: 1,
      notes: {
        user_id: options.userId,
        plan_type: options.planType,
      },
    };

    if (options.userEmail) {
      body.customer_notify = 1;
    }

    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.description || 'Failed to create subscription');
    }

    const sub = await res.json();
    return { success: true, subscriptionId: sub.id, shortUrl: sub.short_url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Cancel Razorpay Subscription ───

export async function cancelRazorpaySubscription(subscriptionId: string, cancelAtEnd: boolean = true): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ cancel_at_cycle_end: cancelAtEnd ? 1 : 0 }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.description || 'Failed to cancel subscription');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Fetch Razorpay Subscription Status ───

export async function fetchRazorpaySubscription(subscriptionId: string): Promise<any> {
  try {
    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Existing Payment Link functions ───

async function createPaymentLink(amount: number, currency: string, planType: string, billingCycle: string, options: PaymentOptions) {
  const linkData = {
    amount: Math.round(amount * 100),
    currency: currency,
    description: `${planType.toUpperCase()} - ${billingCycle} subscription`,
    customer: {
      name: options.userName || 'Customer',
      email: options.userEmail || '',
      contact: options.userPhone || '',
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: {
      user_id: options.userId || '',
      plan_type: planType,
      billing_cycle: billingCycle,
    },
  };

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.description || 'Failed to create payment link');
  }

  return await response.json();
}

export async function checkPaymentLinkStatus(paymentLinkId: string): Promise<{ paid: boolean; paymentId?: string }> {
  try {
    const response = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) return { paid: false };

    const data = await response.json();
    if (data.status === 'paid') {
      const payments = data.payments || [];
      const paymentId = payments.length > 0 ? payments[0].payment_id : data.id;
      return { paid: true, paymentId };
    }
    return { paid: false };
  } catch (error) {
    console.error('Error checking payment link status:', error);
    return { paid: false };
  }
}

// ─── Initiate recurring subscription payment ───

export async function initiateSubscriptionPayment(options: PaymentOptions): Promise<PaymentResult> {
  try {
    if (options.planType === 'custom') {
      return initiatePayment(options);
    }

    const planId = await ensureRazorpayPlan(options.planType as 'pro' | 'premium');

    const result = await createRazorpaySubscription({
      planId,
      userId: options.userId || '',
      planType: options.planType,
      userEmail: options.userEmail,
      userName: options.userName,
    });

    if (result.success && result.shortUrl) {
      await Linking.openURL(result.shortUrl);
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create subscription' };
  }
}

// ─── Initiate one-time payment (custom swipes) ───

export async function initiatePayment(options: PaymentOptions): Promise<PaymentResult> {
  try {
    const paymentLink = await createPaymentLink(
      options.amount,
      options.currency || 'INR',
      options.planType,
      options.billingCycle,
      options
    );

    await Linking.openURL(paymentLink.short_url);

    return {
      success: true,
      paymentLinkId: paymentLink.id,
      orderId: paymentLink.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment failed',
    };
  }
}
