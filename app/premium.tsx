import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Switch, Animated, Alert, ActivityIndicator, TextInput, Image, AppState } from 'react-native';
import SmoothSlider from '@/components/SmoothSlider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Crown, Check, X as XIcon, Zap, Sparkles, Shield, Star, Tag } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { initiatePayment, checkPaymentLinkStatus } from '@/lib/razorpay';
import { validateCoupon, calculateDiscountedPrice, type Coupon } from '@/lib/coupons';
import { activateSubscription, activateCustomSwipes, getSubscriptionStatus } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPARISON_FEATURES = [
  { label: 'Job applications', free: '40/month', pro: '100/month', premium: '500/month' },
  { label: 'AI auto-fill', free: false, pro: true, premium: true },
  { label: 'Priority support', free: false, pro: true, premium: true },
  { label: 'Profile visibility boost', free: false, pro: true, premium: true },
];

const FEATURE_TAGS = [
  'AI Auto-Apply', 'Smart Matching', 'Priority Support', 'Profile Boost',
  'Resume Builder', 'Interview Prep', 'Salary Insights', 'Career Coach',
  'Job Alerts', 'Application Tracking'
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const navigateAfterSubscription = () => {
    if (from === 'onboarding') {
      router.replace('/onboarding');
    } else {
      router.back();
    }
  };
  const { supabaseUserId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium' | 'custom'>('pro');
  const [customSwipes, setCustomSwipes] = useState(10);
  const [isAnnual, setIsAnnual] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingPaymentRef = useRef<{ paymentLinkId: string; planType: 'pro' | 'premium' | 'custom'; billingCycle: string; amount: number; couponCode?: string; customSwipes?: number } | null>(null);

  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const currentSubscription = subscriptionData?.subscription_type || 'free';

  // Poll for payment completion when user returns to the app
  const verifyPendingPayment = useCallback(async () => {
    const pending = pendingPaymentRef.current;
    if (!pending || !supabaseUserId) return;

    setIsVerifying(true);
    try {
      // Poll up to 5 times with 2s intervals
      for (let i = 0; i < 5; i++) {
        const status = await checkPaymentLinkStatus(pending.paymentLinkId);
        if (status.paid) {
          const result = pending.planType === 'custom'
            ? await activateCustomSwipes(
                supabaseUserId,
                pending.customSwipes || 0,
                status.paymentId,
                pending.paymentLinkId,
                pending.amount,
                pending.couponCode
              )
            : await activateSubscription(
                supabaseUserId,
                pending.planType,
                status.paymentId,
                pending.paymentLinkId,
                pending.amount,
                pending.couponCode
              );

          pendingPaymentRef.current = null;
          if (result.success) {
            await refetchSubscription();
            queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
            Alert.alert(
              pending.planType === 'custom' ? 'Swipes Added! 🎉' : 'Subscription Activated! 🎉',
              pending.planType === 'custom'
                ? `${pending.customSwipes} swipes have been added to your account!`
                : `You are now subscribed to the ${pending.planType.toUpperCase()} plan!`,
              [{ text: 'OK', onPress: navigateAfterSubscription }]
            );
          } else {
            Alert.alert('Error', result.error || 'Failed to activate subscription. Please contact support.');
          }
          setIsVerifying(false);
          return;
        }
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      // Payment not yet confirmed after polling
      setIsVerifying(false);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setIsVerifying(false);
    }
  }, [supabaseUserId, refetchSubscription, queryClient]);

  // Listen for app returning to foreground after payment
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingPaymentRef.current) {
        verifyPendingPayment();
      }
    });
    return () => subscription.remove();
  }, [verifyPendingPayment]);

  useEffect(() => {
    const totalWidth = FEATURE_TAGS.length * 140;
    const animate = () => {
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: -totalWidth,
          duration: 20000,
          useNativeDriver: true,
        })
      ).start();
    };
    animate();
  }, []);

  const getPlanPrice = () => {
    if (selectedPlan === 'free') return 0;
    if (selectedPlan === 'custom') return +(customSwipes * 0.15).toFixed(2);
    if (selectedPlan === 'pro') return isAnnual ? 225 : 20;
    return isAnnual ? 799 : 79.99;
  };

  const getPlanPriceInINR = () => {
    const usdPrice = getPlanPrice();
    const conversionRate = 94; // 1 USD = 94 INR (approximate)
    return Math.round(usdPrice * conversionRate);
  };

  const getFinalPrice = () => {
    const originalPrice = getPlanPrice();
    if (appliedCoupon) {
      return calculateDiscountedPrice(originalPrice, appliedCoupon);
    }
    return originalPrice;
  };

  const handleApplyCoupon = () => {
    const coupon = validateCoupon(couponCode);
    if (coupon) {
      setAppliedCoupon(coupon);
      Alert.alert('Coupon Applied! 🎉', coupon.description);
    } else {
      Alert.alert('Invalid Coupon', 'This coupon code is not valid or has expired.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      Alert.alert('Free Plan', 'You are already on the free plan!');
      return;
    }

    if (selectedPlan === 'custom' && customSwipes === 0) {
      Alert.alert('Select Swipes', 'Please select at least 1 swipe to purchase.');
      return;
    }

    setIsProcessing(true);

    try {
      const finalAmount = getFinalPrice();
      const finalAmountINR = Math.round(finalAmount * 94); // Convert USD to INR
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to subscribe');
        return;
      }
      
      // If coupon makes it free, skip payment and activate directly
      if (finalAmount === 0) {
        const result = selectedPlan === 'custom'
          ? await activateCustomSwipes(user.id, customSwipes, undefined, undefined, 0, appliedCoupon?.code)
          : await activateSubscription(user.id, selectedPlan, undefined, undefined, 0, appliedCoupon?.code);

        if (result.success) {
          Alert.alert(
            selectedPlan === 'custom' ? 'Swipes Added! 🎉' : 'Subscription Activated! 🎉',
            selectedPlan === 'custom'
              ? `${customSwipes} swipes have been added to your account!`
              : `You are now subscribed to ${selectedPlan.toUpperCase()} plan for free!`,
            [{ text: 'OK', onPress: navigateAfterSubscription }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to activate subscription');
        }
        return;
      }

      const result = await initiatePayment({
        amount: finalAmountINR,
        planType: selectedPlan,
        billingCycle: selectedPlan === 'custom' ? 'one-time' : (isAnnual ? 'annual' : 'monthly'),
        currency: 'INR',
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.full_name || user.user_metadata?.name,
      });

      if (result.success && result.paymentLinkId) {
        pendingPaymentRef.current = {
          paymentLinkId: result.paymentLinkId,
          planType: selectedPlan,
          billingCycle: selectedPlan === 'custom' ? 'one-time' : (isAnnual ? 'annual' : 'monthly'),
          amount: finalAmountINR,
          couponCode: appliedCoupon?.code,
          ...(selectedPlan === 'custom' && { customSwipes }),
        };
      } else if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Image source={require('@/assets/images/image.png')} style={styles.banner} resizeMode="cover" />
        <View style={styles.heroSection}>
          {currentSubscription === 'free' && (
            <>
              <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
              <Text style={styles.heroSubtext}>Premium users are <Text style={styles.heroHighlight}>60x more likely</Text> to get an interview</Text>
            </>
          )}
          {currentSubscription === 'pro' && (
            <>
              <Text style={styles.heroTitle}>Upgrade to Premium</Text>
              <Text style={styles.heroSubtext}>Get <Text style={styles.heroHighlight}>5x more applications</Text> and exclusive features</Text>
            </>
          )}
          {currentSubscription === 'premium' && (
            <>
              <Text style={styles.heroTitle}>You're a Premium Member!</Text>
              <Text style={styles.heroSubtext}>Enjoying all the <Text style={styles.heroHighlight}>exclusive benefits</Text> of Premium</Text>
            </>
          )}
        </View>

        <View style={styles.billingToggle}>
          <Text style={[styles.billingLabel, !isAnnual && styles.billingLabelActive]}>Monthly</Text>
          <Switch value={isAnnual} onValueChange={setIsAnnual} trackColor={{ false: '#E0E0E0', true: Colors.accent }} thumbColor="#FFFFFF" />
          <Text style={[styles.billingLabel, isAnnual && styles.billingLabelActive]}>Annual</Text>
          {isAnnual && <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save 25%</Text></View>}
        </View>

        <Text style={styles.pricingSectionTitle}>
          {currentSubscription === 'premium' ? 'Your Current Plan' : 'Choose Your Plan'}
        </Text>

        <Pressable
          style={[styles.planOption, selectedPlan === 'free' && styles.planOptionSelected]}
          onPress={() => setSelectedPlan('free')}
          disabled={currentSubscription !== 'free'}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'free' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planOptionInfo}>
            <View style={styles.planNameRow}>
              <Text style={styles.planOptionName}>Free</Text>
              {currentSubscription === 'free' && (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanText}>Current</Text>
                </View>
              )}
            </View>
            <Text style={styles.planOptionDesc}>40 applications / month</Text>
          </View>
          <Text style={styles.planOptionPrice}>$0</Text>
        </Pressable>

        <Pressable
          style={[styles.planOption, selectedPlan === 'pro' && styles.planOptionSelected]}
          onPress={() => setSelectedPlan('pro')}
          disabled={currentSubscription === 'premium'}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'pro' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planOptionInfo}>
            <View style={styles.planNameRow}>
              <Text style={styles.planOptionName}>Pro</Text>
              {currentSubscription === 'pro' && (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanText}>Current</Text>
                </View>
              )}
              {currentSubscription !== 'pro' && (
                <View style={styles.popularTag}>
                  <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.popularTagText}>Popular</Text>
                </View>
              )}
            </View>
            <Text style={styles.planOptionDesc}>100 applications / month</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.planOptionPrice}>{isAnnual ? '$225' : '$20'}</Text>
            <Text style={styles.planOptionPeriod}>{isAnnual ? '/year' : '/month'}</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.planOption, selectedPlan === 'premium' && styles.planOptionSelected]}
          onPress={() => setSelectedPlan('premium')}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'premium' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planOptionInfo}>
            <View style={styles.planNameRow}>
              <Text style={styles.planOptionName}>Premium</Text>
              {currentSubscription === 'premium' && (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanText}>Current</Text>
                </View>
              )}
              {currentSubscription !== 'premium' && (
                <View style={styles.bestValueTag}>
                  <Text style={styles.bestValueText}>Best Value</Text>
                </View>
              )}
            </View>
            <Text style={styles.planOptionDesc}>500 applications / month</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.planOptionPrice}>{isAnnual ? '$799' : '$79.99'}</Text>
            <Text style={styles.planOptionPeriod}>{isAnnual ? '/year' : '/month'}</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.planOption, selectedPlan === 'custom' && styles.planOptionSelected]}
          onPress={() => setSelectedPlan('custom')}
        >
          <View style={styles.planRadio}>
            {selectedPlan === 'custom' && <View style={styles.planRadioInner} />}
          </View>
          <View style={styles.planOptionInfo}>
            <View style={styles.planNameRow}>
              <Text style={styles.planOptionName}>Custom</Text>
              <View style={styles.customTag}>
                <Text style={styles.customTagText}>Pay Per Swipe</Text>
              </View>
            </View>
            <Text style={styles.planOptionDesc}>One-time purchase · Buy only what you need</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.planOptionPrice}>${(customSwipes * 0.15).toFixed(2)}</Text>
            <Text style={styles.planOptionPeriod}>one-time</Text>
          </View>
        </Pressable>

        {selectedPlan === 'custom' && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Number of swipes</Text>
              <View style={styles.swipeCountBadge}>
                <Text style={styles.swipeCountText}>{customSwipes}</Text>
              </View>
            </View>
            <SmoothSlider
              value={customSwipes}
              min={0}
              max={50}
              step={1}
              onValueChange={setCustomSwipes}
              width={SCREEN_WIDTH - 64}
              trackHeight={6}
              thumbSize={28}
              activeColor="#7C3AED"
              inactiveColor="#E0E0E0"
              thumbColor="#7C3AED"
            />
            <View style={styles.sliderRange}>
              <Text style={styles.sliderRangeText}>0</Text>
              <Text style={styles.sliderRangeText}>25</Text>
              <Text style={styles.sliderRangeText}>50</Text>
            </View>
            <Text style={styles.sliderHelperText}>
              {customSwipes === 0
                ? 'Drag the slider to select swipes'
                : `${customSwipes} swipe${customSwipes > 1 ? 's' : ''} — $${(customSwipes * 0.15).toFixed(2)}`}
            </Text>
          </View>
        )}

        {selectedPlan !== 'free' && selectedPlan !== 'custom' && currentSubscription !== 'premium' && (
          <View style={styles.couponSection}>
            <View style={styles.couponInputRow}>
              <Tag size={20} color={Colors.textSecondary} style={styles.couponIcon} />
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                placeholderTextColor={Colors.textTertiary}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                editable={!appliedCoupon}
              />
              {appliedCoupon ? (
                <Pressable style={styles.removeCouponBtn} onPress={handleRemoveCoupon}>
                  <XIcon size={16} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable style={styles.applyCouponBtn} onPress={handleApplyCoupon}>
                  <Text style={styles.applyCouponText}>Apply</Text>
                </Pressable>
              )}
            </View>
            {appliedCoupon && (
              <View style={styles.couponApplied}>
                <Check size={14} color="#10B981" />
                <Text style={styles.couponAppliedText}>{appliedCoupon.description}</Text>
              </View>
            )}
          </View>
        )}

        {appliedCoupon && selectedPlan !== 'free' && selectedPlan !== 'custom' && currentSubscription !== 'premium' && (
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Original Price:</Text>
              <Text style={styles.priceValue}>${getPlanPrice()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount:</Text>
              <Text style={styles.discountValue}>-${(getPlanPrice() - getFinalPrice()).toFixed(2)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${getFinalPrice().toFixed(2)}</Text>
            </View>
          </View>
        )}

        <Pressable 
          style={[
            styles.subscribeBtn, 
            (isProcessing || isVerifying || currentSubscription === selectedPlan || (selectedPlan === 'custom' && customSwipes === 0)) && styles.subscribeBtnDisabled
          ]} 
          onPress={handleSubscribe} 
          disabled={isProcessing || isVerifying || currentSubscription === selectedPlan || (selectedPlan === 'custom' && customSwipes === 0)}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : isVerifying ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.subscribeBtnText}>Verifying Payment...</Text>
            </View>
          ) : currentSubscription === selectedPlan ? (
            <Text style={styles.subscribeBtnText}>Current Plan</Text>
          ) : (
            <Text style={styles.subscribeBtnText}>
              {selectedPlan === 'free' 
                ? 'Continue with Free'
                : selectedPlan === 'custom'
                ? customSwipes === 0 ? 'Select swipes to buy' : `Buy ${customSwipes} swipe${customSwipes > 1 ? 's' : ''} for ₹${Math.round(customSwipes * 0.15 * 94)}`
                : getFinalPrice() === 0
                ? 'Activate Free Subscription'
                : `Subscribe for ₹${getPlanPriceInINR()}${isAnnual ? '/year' : '/month'}`}
            </Text>
          )}
        </Pressable>

        <View style={styles.featureCarouselContainer}>
          <Animated.View style={[styles.featureCarousel, { transform: [{ translateX: scrollX }] }]}>
            {[...FEATURE_TAGS, ...FEATURE_TAGS].map((tag, idx) => (
              <View key={idx} style={styles.featureTag}>
                <Text style={styles.featureTagText}>{tag}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        <View style={styles.whatYouGetSection}>
          <Text style={styles.whatYouGetTitle}>What you get</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.compTableHeader}>
              <Text style={styles.compTableFeatureHeader}>Feature</Text>
              <Text style={styles.compTablePlanHeader}>Free</Text>
              <Text style={styles.compTablePlanHeader}>Pro</Text>
              <Text style={[styles.compTablePlanHeader, styles.compTablePremiumHeader]}>Premium</Text>
            </View>
            {COMPARISON_FEATURES.map((feat, idx) => (
              <View key={idx} style={[styles.compTableRow, idx % 2 === 0 && styles.compTableRowAlt]}>
                <Text style={styles.compTableFeature}>{feat.label}</Text>
                <View style={styles.compTableCell}>
                  {typeof feat.free === 'string' ? (
                    <Text style={styles.compTableValue}>{feat.free}</Text>
                  ) : feat.free ? (
                    <Check size={16} color={Colors.accent} />
                  ) : (
                    <XIcon size={16} color={Colors.textTertiary} />
                  )}
                </View>
                <View style={styles.compTableCell}>
                  {typeof feat.pro === 'string' ? (
                    <Text style={styles.compTableValue}>{feat.pro}</Text>
                  ) : feat.pro ? (
                    <Check size={16} color={Colors.accent} />
                  ) : (
                    <XIcon size={16} color={Colors.textTertiary} />
                  )}
                </View>
                <View style={styles.compTableCell}>
                  {typeof feat.premium === 'string' ? (
                    <Text style={[styles.compTableValue, styles.compTablePremiumValue]}>{feat.premium}</Text>
                  ) : feat.premium ? (
                    <Check size={16} color={Colors.accent} />
                  ) : (
                    <XIcon size={16} color={Colors.textTertiary} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.benefitsGrid}>
          <View style={styles.benefitCard}>
            <Zap size={22} color="#FFD700" />
            <Text style={styles.benefitTitle}>AI Auto-Apply</Text>
            <Text style={styles.benefitDesc}>Apply to hundreds of jobs automatically</Text>
          </View>
          <View style={styles.benefitCard}>
            <Sparkles size={22} color="#E65100" />
            <Text style={styles.benefitTitle}>Smart Matching</Text>
            <Text style={styles.benefitDesc}>AI matches you with perfect-fit roles</Text>
          </View>
          <View style={styles.benefitCard}>
            <Shield size={22} color={Colors.accent} />
            <Text style={styles.benefitTitle}>Priority Support</Text>
            <Text style={styles.benefitDesc}>Get help whenever you need it</Text>
          </View>
          <View style={styles.benefitCard}>
            <Crown size={22} color="#FFD700" />
            <Text style={styles.benefitTitle}>Profile Boost</Text>
            <Text style={styles.benefitDesc}>Stand out to recruiters</Text>
          </View>
        </View>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>"I got 3 interview calls within my first week of using NextQuark Premium. The AI auto-apply feature is a game changer!"</Text>
          <Text style={styles.testimonialAuthor}>— Priya S., Software Engineer</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F2FD' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  banner: { width: SCREEN_WIDTH - 32, height: 180, borderRadius: 16, marginBottom: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  crownCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 26, fontWeight: '900' as const, color: Colors.secondary, textAlign: 'center' },
  heroSubtext: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  heroHighlight: { color: Colors.accent, fontWeight: '800' as const },
  timeCompareSection: { backgroundColor: '#111111', borderRadius: 20, padding: 20, marginBottom: 24 },
  timeCompareTitle: { fontSize: 17, fontWeight: '800' as const, color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  barChartContainer: { gap: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 100, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' as const },
  barTrack: { flex: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' },
  barFill: { height: 24, borderRadius: 12 },
  barOther: { backgroundColor: '#D32F2F' },
  barHireswipe: { backgroundColor: Colors.accent, minWidth: 24 },
  barValue: { width: 60, fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF', textAlign: 'right' },
  barCaption: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12 },
  pricingSectionTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 14 },
  planOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: Colors.borderLight },
  planOptionSelected: { borderColor: '#111111' },
  planRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  planRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#111111' },
  planOptionInfo: { flex: 1 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planOptionName: { fontSize: 17, fontWeight: '700' as const, color: Colors.secondary },
  planOptionDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  popularTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1565C0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  popularTagText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  bestValueTag: { backgroundColor: Colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bestValueText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  currentPlanBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  currentPlanText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  priceCol: { alignItems: 'flex-end' },
  planOptionPrice: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary },
  planOptionPeriod: { fontSize: 12, color: Colors.textTertiary },
  subscribeBtn: { backgroundColor: '#111111', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 6, marginBottom: 28 },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  whatYouGetSection: { marginBottom: 24 },
  whatYouGetTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 14 },
  comparisonTable: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  compTableHeader: { flexDirection: 'row', backgroundColor: '#111111', paddingHorizontal: 14, paddingVertical: 12 },
  compTableFeatureHeader: { flex: 1, fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  compTablePlanHeader: { width: 70, fontSize: 13, fontWeight: '700' as const, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  compTablePremiumHeader: { color: '#FFD700' },
  compTableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center' },
  compTableRowAlt: { backgroundColor: '#FAFAFA' },
  compTableFeature: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  compTableCell: { width: 70, alignItems: 'center' },
  compTableValue: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  compTablePremiumValue: { color: Colors.accent, fontWeight: '700' as const },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  benefitCard: { width: (SCREEN_WIDTH - 42) / 2, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  benefitTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.secondary, marginTop: 10, marginBottom: 4 },
  benefitDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  testimonialCard: { backgroundColor: '#111111', borderRadius: 16, padding: 20 },
  testimonialQuote: { fontSize: 15, color: '#FFFFFF', fontStyle: 'italic' as const, lineHeight: 23, marginBottom: 10 },
  testimonialAuthor: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' as const },
  billingToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20, backgroundColor: Colors.surface, borderRadius: 12, padding: 12 },
  billingLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.textTertiary },
  billingLabelActive: { color: Colors.secondary, fontWeight: '700' as const },
  saveBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 4 },
  saveBadgeText: { fontSize: 11, fontWeight: '800' as const, color: '#FFFFFF' },
  couponSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: { marginLeft: 2 },
  couponInput: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary, paddingVertical: 8 },
  applyCouponBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  applyCouponText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
  removeCouponBtn: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  couponAppliedText: { fontSize: 13, color: '#10B981', fontWeight: '600' as const },
  priceBreakdown: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  priceValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  discountValue: { fontSize: 14, fontWeight: '700' as const, color: '#10B981' },
  totalRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '700' as const, color: Colors.secondary },
  totalValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.accent },
  featureCarouselContainer: { height: 40, overflow: 'hidden', marginBottom: 24 },
  featureCarousel: { flexDirection: 'row', gap: 10 },
  featureTag: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderLight },
  featureTagText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  customTag: { backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  customTagText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  sliderSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sliderLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  swipeCountBadge: { backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  swipeCountText: { fontSize: 16, fontWeight: '800' as const, color: '#FFFFFF' },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderRangeText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' as const },
  sliderHelperText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 10 },
});
