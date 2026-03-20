import { Platform, Linking } from 'react-native';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SMzoT0e5YvEGon';
const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || 'Py9XEXKQhScekTPPXOH7xOA5';

export interface PaymentOptions {
  amount: number;
  planType: 'pro' | 'premium';
  billingCycle: 'monthly' | 'annual';
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
  error?: string;
}

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
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: false,
    notes: {
      user_id: options.userId || '',
      plan_type: planType,
      billing_cycle: billingCycle,
    },
  };

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
    },
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
      headers: {
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
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
