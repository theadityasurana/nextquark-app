import { supabase } from './supabase';

export type SubscriptionType = 'free' | 'pro' | 'premium';

export interface SubscriptionData {
  subscription_type: SubscriptionType;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  applications_remaining: number;
  applications_limit: number;
  razorpay_subscription_id?: string | null;
  subscription_status?: string | null;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  subscription_type: string;
  amount: number;
  payment_id: string | null;
  order_id: string | null;
  status: 'completed' | 'failed' | 'pending' | 'abandoned';
  coupon_code: string | null;
  created_at: string;
}

const SUBSCRIPTION_LIMITS: Record<string, number> = {
  free: 40,
  pro: 200,
  premium: 500,
};

// ─── Record a payment attempt (pending) ───

export async function recordPaymentAttempt(
  userId: string,
  subscriptionType: string,
  amount: number,
  paymentLinkId?: string,
  subscriptionId?: string,
  customSwipes?: number
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    const insertData: Record<string, any> = {
      user_id: userId,
      subscription_type: subscriptionType,
      amount,
      payment_id: null,
      order_id: paymentLinkId || subscriptionId || null,
      status: 'pending',
      coupon_code: null,
    };

    const { data, error } = await supabase
      .from('payment_history')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      if (error.code === '42P01') return { success: false, error: 'Table does not exist' };
      throw error;
    }
    return { success: true, recordId: data?.id };
  } catch (error: any) {
    console.error('Error recording payment attempt:', error);
    return { success: false, error: error.message };
  }
}

// ─── Update payment attempt status ───

export async function updatePaymentStatus(
  recordId: string,
  status: 'completed' | 'failed' | 'abandoned' | 'pending',
  paymentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = { status };
    if (paymentId) updateData.payment_id = paymentId;

    const { error } = await supabase
      .from('payment_history')
      .update(updateData)
      .eq('id', recordId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

// ─── Mark stale pending payments as abandoned ───

export async function markAbandonedPayments(userId: string): Promise<void> {
  try {
    // Mark any pending payments older than 30 minutes as abandoned
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await supabase
      .from('payment_history')
      .update({ status: 'abandoned' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('created_at', thirtyMinAgo);
  } catch (error) {
    console.error('Error marking abandoned payments:', error);
  }
}

// ─── Activate custom swipes (one-time purchase) ───

export async function activateCustomSwipes(
  userId: string,
  swipeCount: number,
  paymentId?: string,
  orderId?: string,
  amount?: number,
  couponCode?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('applications_remaining')
      .eq('id', userId)
      .single();
    const currentRemaining = currentProfile?.applications_remaining || 0;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ applications_remaining: currentRemaining + swipeCount })
      .eq('id', userId);

    if (updateError) throw updateError;

    // payment_history is now tracked by recordPaymentAttempt + updatePaymentStatus

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Activate recurring subscription ───

export async function activateSubscription(
  userId: string,
  subscriptionType: SubscriptionType,
  paymentId?: string,
  orderId?: string,
  amount?: number,
  couponCode?: string,
  razorpaySubscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const applicationsLimit = SUBSCRIPTION_LIMITS[subscriptionType];

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('applications_remaining')
      .eq('id', userId)
      .single();
    const currentRemaining = currentProfile?.applications_remaining || 0;

    const baseData: Record<string, any> = {
      subscription_type: subscriptionType,
      subscription_start_date: startDate.toISOString(),
      subscription_end_date: endDate.toISOString(),
      applications_remaining: currentRemaining + applicationsLimit,
      applications_limit: applicationsLimit,
      last_reset_date: startDate.toISOString(),
    };

    const extData: Record<string, any> = {
      ...baseData,
      subscription_status: 'active',
      ...(razorpaySubscriptionId && { razorpay_subscription_id: razorpaySubscriptionId }),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(extData)
      .eq('id', userId);

    if (updateError && updateError.code === '42703') {
      // New columns don't exist yet, retry without them
      const { error: retryError } = await supabase
        .from('profiles')
        .update(baseData)
        .eq('id', userId);
      if (retryError) throw retryError;
    } else if (updateError) {
      throw updateError;
    }

    // payment_history is now tracked by recordPaymentAttempt + updatePaymentStatus

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Handle successful recurring charge (webhook) ───

export async function handleSubscriptionCharged(
  userId: string,
  subscriptionType: SubscriptionType,
  paymentId: string,
  subscriptionId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const applicationsLimit = SUBSCRIPTION_LIMITS[subscriptionType];

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('applications_remaining')
      .eq('id', userId)
      .single();
    const currentRemaining = currentProfile?.applications_remaining || 0;

    // Add new monthly quota on top of remaining swipes
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_end_date: endDate.toISOString(),
        applications_remaining: currentRemaining + applicationsLimit,
        last_reset_date: new Date().toISOString(),
        subscription_status: 'active',
      })
      .eq('id', userId);

    if (error) throw error;

    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_type: subscriptionType,
      amount,
      payment_id: paymentId,
      order_id: subscriptionId,
      status: 'completed',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Handle failed recurring charge — downgrade but retain swipes ───

export async function handleSubscriptionFailed(
  userId: string,
  paymentId: string,
  subscriptionId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('applications_remaining, subscription_type')
      .eq('id', userId)
      .single();

    const currentRemaining = currentProfile?.applications_remaining || 0;
    const freeAllowance = SUBSCRIPTION_LIMITS.free;

    // Downgrade to free but retain remaining swipes + free allowance
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_type: 'free',
        subscription_status: 'payment_failed',
        applications_remaining: currentRemaining + freeAllowance,
        applications_limit: freeAllowance,
        razorpay_subscription_id: null,
      })
      .eq('id', userId);

    if (error) throw error;

    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_type: currentProfile?.subscription_type || 'unknown',
      amount,
      payment_id: paymentId,
      order_id: subscriptionId,
      status: 'failed',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Cancel subscription (stop recurring, retain swipes) ───

export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Set to free and mark as cancelled — user retains remaining swipes
    const extData = {
      subscription_type: 'free',
      subscription_status: 'cancelled',
    };
    const { error } = await supabase
      .from('profiles')
      .update(extData)
      .eq('id', userId);

    if (error && error.code === '42703') {
      // subscription_status column doesn't exist, just update type
      const { error: retryErr } = await supabase
        .from('profiles')
        .update({ subscription_type: 'free' })
        .eq('id', userId);
      if (retryErr) throw retryErr;
    } else if (error) {
      throw error;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Get subscription status ───

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionData | null> {
  try {
    // Try with new columns first, fall back without them
    let data: any = null;
    let error: any = null;

    const fullQuery = await supabase
      .from('profiles')
      .select('subscription_type, subscription_start_date, subscription_end_date, applications_remaining, applications_limit, razorpay_subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (fullQuery.error && fullQuery.error.code === '42703') {
      // Column doesn't exist yet, query without new columns
      const fallback = await supabase
        .from('profiles')
        .select('subscription_type, subscription_start_date, subscription_end_date, applications_remaining, applications_limit')
        .eq('id', userId)
        .single();
      data = fallback.data;
      error = fallback.error;
    } else {
      data = fullQuery.data;
      error = fullQuery.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          subscription_type: 'free',
          subscription_start_date: null,
          subscription_end_date: null,
          applications_remaining: 40,
          applications_limit: 40,
        };
      }
      throw error;
    }

    const subStatus = data.subscription_status || null;

    // Check if subscription expired and no active Razorpay subscription
    if (data.subscription_end_date && new Date(data.subscription_end_date) < new Date() && subStatus !== 'active') {
      await expireSubscription(userId, data.applications_remaining);
      return {
        subscription_type: 'free',
        subscription_start_date: null,
        subscription_end_date: null,
        applications_remaining: data.applications_remaining || 40,
        applications_limit: 40,
      };
    }

    // If cancelled or payment_failed, report as free for the rest of the app
    const resolvedType = (subStatus === 'cancelled' || subStatus === 'payment_failed')
      ? 'free' as const
      : (data.subscription_type || 'free') as 'free' | 'pro' | 'premium';

    return {
      subscription_type: resolvedType,
      subscription_start_date: data.subscription_start_date || null,
      subscription_end_date: data.subscription_end_date || null,
      applications_remaining: data.applications_remaining ?? 40,
      applications_limit: data.applications_limit ?? 40,
      razorpay_subscription_id: data.razorpay_subscription_id || null,
      subscription_status: subStatus,
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

// ─── Get transaction history ───

export async function getTransactionHistory(
  userId: string,
  limit: number = 20
): Promise<TransactionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

// ─── Expire subscription (retain remaining swipes) ───

export async function expireSubscription(userId: string, currentRemaining?: number): Promise<void> {
  const remaining = currentRemaining ?? 40;
  const baseData: Record<string, any> = {
    subscription_type: 'free',
    subscription_start_date: null,
    subscription_end_date: null,
    applications_limit: 40,
    applications_remaining: remaining,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ ...baseData, razorpay_subscription_id: null, subscription_status: null })
    .eq('id', userId);

  if (error && error.code === '42703') {
    await supabase.from('profiles').update(baseData).eq('id', userId);
  }
}

export async function decrementApplicationCount(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('applications_remaining')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    if (data.applications_remaining <= 0) return false;

    await supabase
      .from('profiles')
      .update({ applications_remaining: data.applications_remaining - 1 })
      .eq('id', userId);

    return true;
  } catch (error) {
    return false;
  }
}

export function getSubscriptionDisplayName(type: SubscriptionType): string {
  switch (type) {
    case 'pro': return 'Pro User';
    case 'premium': return 'Premium User';
    default: return 'Free User';
  }
}

export function getSubscriptionBadgeColor(type: SubscriptionType): string {
  switch (type) {
    case 'pro': return '#1565C0';
    case 'premium': return '#E65100';
    default: return '#757575';
  }
}
