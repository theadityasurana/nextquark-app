import { supabase } from './supabase';

export type SubscriptionType = 'free' | 'pro' | 'premium';

export interface SubscriptionData {
  subscription_type: SubscriptionType;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  applications_remaining: number;
  applications_limit: number;
}

const SUBSCRIPTION_LIMITS = {
  free: 40,
  pro: 100,
  premium: 500,
};

export async function activateSubscription(
  userId: string,
  subscriptionType: SubscriptionType,
  paymentId?: string,
  orderId?: string,
  amount?: number,
  couponCode?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month validity

    const applicationsLimit = SUBSCRIPTION_LIMITS[subscriptionType];

    // Fetch current remaining swipes to add on top
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('applications_remaining')
      .eq('id', userId)
      .single();
    const currentRemaining = currentProfile?.applications_remaining || 0;

    // Update user subscription — add new plan limit on top of existing remaining swipes
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_type: subscriptionType,
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        applications_remaining: currentRemaining + applicationsLimit,
        applications_limit: applicationsLimit,
        last_reset_date: startDate.toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Record payment history
    if (paymentId || orderId) {
      await supabase.from('payment_history').insert({
        user_id: userId,
        subscription_type: subscriptionType,
        amount: amount || 0,
        payment_id: paymentId,
        order_id: orderId,
        status: 'completed',
        coupon_code: couponCode,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionData | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_start_date, subscription_end_date, applications_remaining, applications_limit')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, return default free subscription
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

    // Check if subscription expired
    if (data.subscription_end_date && new Date(data.subscription_end_date) < new Date()) {
      // Expire subscription
      await expireSubscription(userId);
      return {
        subscription_type: 'free',
        subscription_start_date: null,
        subscription_end_date: null,
        applications_remaining: 40,
        applications_limit: 40,
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

export async function expireSubscription(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      subscription_type: 'free',
      subscription_start_date: null,
      subscription_end_date: null,
      applications_remaining: 40,
      applications_limit: 40,
    })
    .eq('id', userId);
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
    case 'pro':
      return 'Pro User';
    case 'premium':
      return 'Premium User';
    default:
      return 'Free User';
  }
}

export function getSubscriptionBadgeColor(type: SubscriptionType): string {
  switch (type) {
    case 'pro':
      return '#1565C0';
    case 'premium':
      return '#E65100';
    default:
      return '#757575';
  }
}
