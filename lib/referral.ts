import { supabase } from './supabase';

const SWIPES_PER_REFERRAL = 5;

// Generate unique 8-character referral code
export function generateReferralCode(name: string): string {
  const prefix = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + random;
}

// Create referral code for user
export async function createReferralCode(userId: string, userName: string): Promise<string | null> {
  try {
    let code = generateReferralCode(userName);
    let attempts = 0;
    
    // Ensure unique code
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .single();
      
      if (!existing) break;
      code = generateReferralCode(userName + attempts);
      attempts++;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId);

    return error ? null : code;
  } catch (error) {
    console.error('Error creating referral code:', error);
    return null;
  }
}

// Validate and apply referral code during sign-up
export async function applyReferralCode(
  newUserId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🎁 [REFERRAL] Starting applyReferralCode:', { newUserId, referralCode });
    
    if (!referralCode.trim()) {
      console.log('❌ [REFERRAL] Empty referral code');
      return { success: false, message: 'Invalid referral code' };
    }

    // Find referrer by code (use service role to bypass RLS)
    console.log('🔍 [REFERRAL] Looking up referral code:', referralCode.toUpperCase());
    const { data: referrers, error: referrerError } = await supabase
      .from('profiles')
      .select('id, applications_remaining, applications_limit, referral_swipes_earned')
      .eq('referral_code', referralCode.toUpperCase())
      .limit(1);

    if (referrerError || !referrers || referrers.length === 0) {
      console.log('❌ [REFERRAL] Referral code not found:', referrerError?.message);
      return { success: false, message: 'Referral code not found' };
    }

    const referrer = referrers[0];
    console.log('✅ [REFERRAL] Found referrer:', referrer.id);

    // Prevent self-referral
    if (referrer.id === newUserId) {
      console.log('❌ [REFERRAL] Self-referral attempt');
      return { success: false, message: 'Cannot use your own referral code' };
    }

    // Check if user already used a referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', newUserId)
      .single();

    if (existingReferral) {
      console.log('❌ [REFERRAL] User already used a referral code');
      return { success: false, message: 'You have already used a referral code' };
    }

    console.log('💰 [REFERRAL] Awarding swipes to referrer...');
    // Award swipes to referrer
    const { error: referrerUpdateError } = await supabase
      .from('profiles')
      .update({
        applications_remaining: (referrer.applications_remaining || 0) + SWIPES_PER_REFERRAL,
        applications_limit: (referrer.applications_limit || 0) + SWIPES_PER_REFERRAL,
        referral_swipes_earned: ((referrer as any).referral_swipes_earned || 0) + SWIPES_PER_REFERRAL,
      })
      .eq('id', referrer.id);

    if (referrerUpdateError) {
      console.log('❌ [REFERRAL] Error updating referrer:', referrerUpdateError.message);
    } else {
      console.log('✅ [REFERRAL] Referrer updated successfully');
    }

    console.log('💰 [REFERRAL] Awarding swipes to new user...');
    // Award swipes to new user
    const { data: newUser } = await supabase
      .from('profiles')
      .select('applications_remaining, applications_limit')
      .eq('id', newUserId)
      .single();

    const { error: newUserUpdateError } = await supabase
      .from('profiles')
      .update({
        applications_remaining: (newUser?.applications_remaining || 40) + SWIPES_PER_REFERRAL,
        applications_limit: (newUser?.applications_limit || 40) + SWIPES_PER_REFERRAL,
        referred_by: referrer.id,
      })
      .eq('id', newUserId);

    if (newUserUpdateError) {
      console.log('❌ [REFERRAL] Error updating new user:', newUserUpdateError.message);
    } else {
      console.log('✅ [REFERRAL] New user updated successfully');
    }

    console.log('📝 [REFERRAL] Recording referral...');
    // Record referral
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referee_id: newUserId,
      referral_code: referralCode.toUpperCase(),
      swipes_awarded: SWIPES_PER_REFERRAL,
    });

    if (insertError) {
      console.log('❌ [REFERRAL] Error inserting referral record:', insertError.message);
    } else {
      console.log('✅ [REFERRAL] Referral recorded successfully');
    }

    console.log('🎉 [REFERRAL] Referral process completed successfully!');
    return { success: true, message: `You earned ${SWIPES_PER_REFERRAL} bonus swipes!` };
  } catch (error) {
    console.error('💥 [REFERRAL] Exception in applyReferralCode:', error);
    return { success: false, message: 'Failed to apply referral code' };
  }
}

// Get referral stats for user
export async function getReferralStats(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_swipes_earned')
      .eq('id', userId)
      .single();

    const { data: referrals, count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .eq('referrer_id', userId);

    return {
      referralCode: profile?.referral_code || null,
      totalSwipesEarned: profile?.referral_swipes_earned || 0,
      totalReferrals: count || 0,
      referrals: referrals || [],
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return null;
  }
}
