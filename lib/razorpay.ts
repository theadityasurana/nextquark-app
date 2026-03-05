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
  signature?: string;
  error?: string;
}

async function createRazorpayOrder(amount: number, currency: string, planType: string, billingCycle: string) {
  const orderData = {
    amount: Math.round(amount * 100), // Convert to paise and ensure integer
    currency: currency,
    receipt: `receipt_${Date.now()}`,
    notes: {
      planType,
      billingCycle,
    },
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.description || 'Failed to create order');
  }

  return await response.json();
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
    callback_url: 'https://yourapp.com/payment-callback',
    callback_method: 'get',
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

export async function initiatePayment(options: PaymentOptions): Promise<PaymentResult> {
  try {
    // Create payment link
    const paymentLink = await createPaymentLink(
      options.amount,
      options.currency || 'INR',
      options.planType,
      options.billingCycle,
      options
    );
    
    // Open payment link in browser
    await Linking.openURL(paymentLink.short_url);

    return {
      success: true,
      orderId: paymentLink.id,
      error: 'Payment opened in browser',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment failed',
    };
  }
}
