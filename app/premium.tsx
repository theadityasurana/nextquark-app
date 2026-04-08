import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated, Alert, ActivityIndicator, TextInput, Image, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SmoothSlider from '@/components/SmoothSlider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Crown, Check, X as XIcon, Zap, Star } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { initiatePayment, initiateSubscriptionPayment, checkPaymentLinkStatus, cancelRazorpaySubscription } from '@/lib/razorpay';
import { validateCoupon, calculateDiscountedPrice, type Coupon } from '@/lib/coupons';
import { activateSubscription, activateCustomSwipes, getSubscriptionStatus, getTransactionHistory, cancelSubscription, recordPaymentAttempt, updatePaymentStatus, markAbandonedPayments, type TransactionRecord } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendSubscriptionNotification } from '@/lib/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPARISON_FEATURES = [
  { label: 'Job applications', free: '40/month', pro: '200', premium: '500' },
  { label: 'AI auto-fill', free: false as const, pro: true, premium: true },
  { label: 'Priority support', free: false as const, pro: true, premium: true },
  { label: 'Profile visibility boost', free: false as const, pro: true, premium: true },
];


const PLAN_TIERS: Record<string, number> = { free: 0, pro: 1, premium: 2, custom: 3 };

const TESTIMONIAL_HEIGHT = 130;
const TESTIMONIAL_GAP = 12;

const TESTIMONIALS = [
  { quote: 'I got 3 interview calls within my first week of using Premium. The AI auto-apply feature is a game changer!', name: 'Priya S.', role: 'Software Engineer', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/women/44.jpg' } },
  { quote: 'Went from 0 callbacks to 5 interviews in 2 weeks. The smart matching is incredibly accurate.', name: 'Rahul M.', role: 'Product Manager', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/32.jpg' } },
  { quote: 'The profile boost alone was worth it. Recruiters started reaching out to me directly!', name: 'Ananya K.', role: 'UX Designer', rating: 4, avatar: { uri: 'https://randomuser.me/api/portraits/women/68.jpg' } },
  { quote: 'Applied to 150 jobs in one weekend. Manually that would have taken me a month!', name: 'Vikram T.', role: 'Data Scientist', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/75.jpg' } },
  { quote: 'The priority support team helped me fix my resume in 24 hours. Incredible service.', name: 'Sneha R.', role: 'Marketing Lead', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/women/26.jpg' } },
  { quote: 'I was skeptical at first, but Premium paid for itself after my first offer letter.', name: 'Arjun D.', role: 'Backend Developer', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/46.jpg' } },
  { quote: 'Smart matching found me a role I never would have searched for. Now I love my job!', name: 'Meera P.', role: 'DevOps Engineer', rating: 4, avatar: { uri: 'https://randomuser.me/api/portraits/women/52.jpg' } },
  { quote: 'Switched careers from finance to tech. The AI auto-fill made applications so much easier.', name: 'Karthik N.', role: 'Frontend Developer', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/men/22.jpg' } },
  { quote: 'As a fresh graduate, this gave me a huge edge. Got placed within 3 weeks of subscribing.', name: 'Divya L.', role: 'Junior Analyst', rating: 5, avatar: { uri: 'https://randomuser.me/api/portraits/women/17.jpg' } },
  { quote: 'The profile visibility boost is real. My LinkedIn views tripled after upgrading.', name: 'Rohan G.', role: 'Full Stack Developer', rating: 4, avatar: { uri: 'https://randomuser.me/api/portraits/men/86.jpg' } },
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
  // Always use dark theme for premium page
  const dk = {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    border: '#333333',
    borderLight: '#2A2A2A',
    secondary: '#FFFFFF',
    accent: '#00E676',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
  };
  const themeColors = dk as any;
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'premium' | 'custom'>('pro');
  const [customSwipes, setCustomSwipes] = useState(10);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const testimonialScrollY = useRef(new Animated.Value(0)).current;
  const [isRefreshingTx, setIsRefreshingTx] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscription'>('plans');
  const pendingPaymentRef = useRef<{ paymentLinkId: string; planType: 'pro' | 'premium' | 'custom'; billingCycle: string; amount: number; couponCode?: string; customSwipes?: number; recordId?: string } | null>(null);

  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription-status', supabaseUserId],
    queryFn: () => getSubscriptionStatus(supabaseUserId!),
    enabled: !!supabaseUserId,
  });

  const currentSubscription = subscriptionData?.subscription_type || 'free';
  const subscriptionStatus = subscriptionData?.subscription_status || null;
  const hasActiveSubscription = currentSubscription !== 'free' || subscriptionStatus === 'cancelled';
  // effectivePlan = currentSubscription since getSubscriptionStatus already resolves cancelled/failed to free
  const effectivePlan = currentSubscription;

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['transaction-history', supabaseUserId],
    queryFn: () => getTransactionHistory(supabaseUserId!, 20),
    enabled: !!supabaseUserId,
  });

  const handleRefreshTransactions = async () => {
    setIsRefreshingTx(true);
    await refetchTransactions();
    setIsRefreshingTx(false);
  };

  // Poll for payment completion when user returns to the app
  const verifyPendingPayment = useCallback(async () => {
    const pending = pendingPaymentRef.current;
    if (!pending || !supabaseUserId) return;

    setIsVerifying(true);
    try {
      for (let i = 0; i < 5; i++) {
        const status = await checkPaymentLinkStatus(pending.paymentLinkId);
        if (status.paid) {
          if (pending.recordId) {
            await updatePaymentStatus(pending.recordId, 'completed', status.paymentId);
          }
          const result = pending.planType === 'custom'
            ? await activateCustomSwipes(supabaseUserId, pending.customSwipes || 0, status.paymentId, pending.paymentLinkId, pending.amount, pending.couponCode)
            : await activateSubscription(supabaseUserId, pending.planType, status.paymentId, pending.paymentLinkId, pending.amount, pending.couponCode);

          pendingPaymentRef.current = null;
          await refetchTransactions();
          if (result.success) {
            await sendSubscriptionNotification(pending.planType);
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      // Payment not confirmed — mark as failed
      if (pending.recordId) {
        await updatePaymentStatus(pending.recordId, 'failed');
      }
      pendingPaymentRef.current = null;
      setIsVerifying(false);
      await refetchTransactions();
    } catch (error) {
      console.error('Error verifying payment:', error);
      setIsVerifying(false);
    }
  }, [supabaseUserId, refetchSubscription, refetchTransactions, queryClient]);

  // Mark stale pending payments as abandoned on mount
  useEffect(() => {
    if (supabaseUserId) {
      markAbandonedPayments(supabaseUserId).then(() => refetchTransactions());
    }
  }, [supabaseUserId]);

  useEffect(() => {
    const itemTotal = TESTIMONIAL_HEIGHT + TESTIMONIAL_GAP;
    const totalScroll = TESTIMONIALS.length * itemTotal;
    Animated.loop(
      Animated.timing(testimonialScrollY, {
        toValue: -totalScroll,
        duration: TESTIMONIALS.length * 3500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Listen for app returning to foreground after payment
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingPaymentRef.current) {
        verifyPendingPayment();
      }
    });
    return () => subscription.remove();
  }, [verifyPendingPayment]);

  const getPlanPriceInINR = () => {
    if (selectedPlan === 'custom') return customSwipes * 15;
    if (selectedPlan === 'pro') return 1999;
    return 7599;
  };

  const getFinalPrice = () => {
    const originalPrice = getPlanPriceInINR();
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
    if (selectedPlan !== 'custom' && PLAN_TIERS[selectedPlan] <= PLAN_TIERS[effectivePlan]) {
      Alert.alert('Cannot Downgrade', `You are already on the ${effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1)} plan.`);
      return;
    }
    if (selectedPlan === 'custom' && customSwipes === 0) {
      Alert.alert('Select Swipes', 'Please select at least 1 swipe to purchase.');
      return;
    }

    setIsProcessing(true);

    try {
      const finalAmountINR = getFinalPrice();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to subscribe');
        return;
      }
      
      // If coupon makes it free, skip payment and activate directly
      if (finalAmountINR === 0) {
        const couponAttempt = await recordPaymentAttempt(user.id, selectedPlan === 'custom' ? 'custom' : selectedPlan, 0);
        const result = selectedPlan === 'custom'
          ? await activateCustomSwipes(user.id, customSwipes, undefined, undefined, 0, appliedCoupon?.code)
          : await activateSubscription(user.id, selectedPlan, undefined, undefined, 0, appliedCoupon?.code);

        if (result.success) {
          if (couponAttempt.recordId) await updatePaymentStatus(couponAttempt.recordId, 'completed');
          await sendSubscriptionNotification(selectedPlan, true);
          await refetchTransactions();
          await refetchSubscription();
          queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
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

      if (selectedPlan === 'custom') {
        // Record attempt in Supabase
        const attempt = await recordPaymentAttempt(user.id, 'custom', finalAmountINR, undefined, undefined, customSwipes);

        const result = await initiatePayment({
          amount: finalAmountINR,
          planType: selectedPlan,
          billingCycle: 'one-time',
          currency: 'INR',
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.user_metadata?.name,
        });

        if (result.success && result.paymentLinkId) {
          // Update record with payment link ID
          if (attempt.recordId) {
            await updatePaymentStatus(attempt.recordId, 'pending', undefined);
            await supabase.from('payment_history').update({ order_id: result.paymentLinkId }).eq('id', attempt.recordId);
          }
          pendingPaymentRef.current = {
            paymentLinkId: result.paymentLinkId,
            planType: selectedPlan,
            billingCycle: 'one-time',
            amount: finalAmountINR,
            couponCode: appliedCoupon?.code,
            customSwipes,
            recordId: attempt.recordId,
          };
          await refetchTransactions();
        } else if (!result.success) {
          if (attempt.recordId) await updatePaymentStatus(attempt.recordId, 'failed');
          await refetchTransactions();
          Alert.alert('Error', result.error || 'Failed to initiate payment');
        }
      } else {
        // Record attempt in Supabase
        const attempt = await recordPaymentAttempt(user.id, selectedPlan, finalAmountINR);

        const result = await initiateSubscriptionPayment({
          amount: finalAmountINR,
          planType: selectedPlan,
          billingCycle: 'monthly',
          currency: 'INR',
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.user_metadata?.name,
        });

        if (result.success && result.subscriptionId) {
          if (attempt.recordId) {
            await supabase.from('payment_history').update({ order_id: result.subscriptionId }).eq('id', attempt.recordId);
          }
          pendingPaymentRef.current = {
            paymentLinkId: result.subscriptionId,
            planType: selectedPlan,
            billingCycle: 'monthly',
            amount: finalAmountINR,
            couponCode: appliedCoupon?.code,
            recordId: attempt.recordId,
          };
          await refetchTransactions();
          Alert.alert('Subscription Initiated', 'Complete the payment in the browser. Your plan will activate automatically.');
        } else if (result.success && result.paymentLinkId) {
          if (attempt.recordId) {
            await supabase.from('payment_history').update({ order_id: result.paymentLinkId }).eq('id', attempt.recordId);
          }
          pendingPaymentRef.current = {
            paymentLinkId: result.paymentLinkId,
            planType: selectedPlan,
            billingCycle: 'monthly',
            amount: finalAmountINR,
            couponCode: appliedCoupon?.code,
            recordId: attempt.recordId,
          };
        } else if (!result.success) {
          if (attempt.recordId) await updatePaymentStatus(attempt.recordId, 'failed');
          await refetchTransactions();
          Alert.alert('Error', result.error || 'Failed to initiate payment');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!supabaseUserId) return;
    Alert.alert(
      'Cancel Subscription',
      'Your recurring payments will stop, but you will keep your remaining swipes until the end of the billing cycle.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              if (subscriptionData?.razorpay_subscription_id) {
                await cancelRazorpaySubscription(subscriptionData.razorpay_subscription_id, true);
              }
              const result = await cancelSubscription(supabaseUserId);
              if (result.success) {
                await refetchSubscription();
                queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
                Alert.alert('Subscription Cancelled', 'Recurring payments have been stopped. You retain your remaining swipes.');
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel subscription');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel subscription');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string | null) => {
    if (status === 'active') return '#10B981';
    if (status === 'cancelled') return '#F59E0B';
    if (status === 'payment_failed') return '#EF4444';
    return '#10B981'; // default to active green when column doesn't exist yet
  };

  const getStatusLabel = (status: string | null) => {
    if (status === 'active') return 'Active';
    if (status === 'cancelled') return 'Cancelled (active until cycle end)';
    if (status === 'payment_failed') return 'Payment Failed — Downgraded';
    return 'Active'; // default when column doesn't exist yet
  };

  const getCtaLabel = () => {
    if (effectivePlan === selectedPlan && effectivePlan !== 'free') return 'Current Plan';
    if (isDowngrade) return `Already on ${effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1)}`;
    if (selectedPlan === 'custom') {
      return customSwipes === 0 ? 'Select swipes to buy' : `Buy ${customSwipes} swipe${customSwipes > 1 ? 's' : ''} for ₹${customSwipes * 15}`;
    }
    return getFinalPrice() === 0 ? 'Activate Free Subscription' : `Subscribe for ₹${getPlanPriceInINR()}`;
  };

  const isDowngrade = selectedPlan !== 'custom' && PLAN_TIERS[selectedPlan] <= PLAN_TIERS[effectivePlan];
  const isCtaDisabled = isProcessing || isVerifying || isDowngrade || (selectedPlan === 'custom' && customSwipes === 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#121212' }]}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#121212']} style={styles.heroGradient}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <View style={{ width: 40 }} />
        </View>
        <Image source={require('@/assets/images/image.png')} style={styles.banner} resizeMode="cover" />
        <View style={styles.heroSection}>
          {effectivePlan === 'free' && (
            <>
              <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>Unlock Your Full Potential</Text>
              <Text style={[styles.heroSubtext, { color: themeColors.textSecondary }]}>Premium users are <Text style={styles.heroHighlight}>60x more likely</Text> to get an interview</Text>
            </>
          )}
          {effectivePlan === 'pro' && (
            <>
              <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>Upgrade to Premium</Text>
              <Text style={[styles.heroSubtext, { color: themeColors.textSecondary }]}>Get <Text style={styles.heroHighlight}>5x more applications</Text> and exclusive features</Text>
            </>
          )}
          {effectivePlan === 'premium' && (
            <>
              <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>You're a Premium Member!</Text>
              <Text style={[styles.heroSubtext, { color: themeColors.textSecondary }]}>Enjoying all the <Text style={styles.heroHighlight}>exclusive benefits</Text> of Premium</Text>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View>
          <View style={styles.tabBar}>
            <Pressable style={[styles.tab, activeTab === 'plans' && styles.tabActive]} onPress={() => setActiveTab('plans')}>
              <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>Choose Plan</Text>
            </Pressable>
            <Pressable style={[styles.tab, activeTab === 'subscription' && styles.tabActive]} onPress={() => setActiveTab('subscription')}>
              <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>Subscription</Text>
            </Pressable>
          </View>

          {activeTab === 'plans' ? (
            <View>
        <Text style={[styles.pricingSectionTitle, { color: themeColors.secondary }]}>
          {effectivePlan === 'premium' ? 'Your Current Plan' : 'Choose Your Plan'}
        </Text>

        <View style={styles.planBoxRow}>
          {[
            { key: 'pro' as const, label: 'Pro', apps: '200', sub: 'apps', price: '₹1,999', popular: true, color: '#1565C0' },
            { key: 'premium' as const, label: 'Premium', apps: '500', sub: 'apps', price: '₹7,599', popular: false, color: '#E65100' },
            { key: 'custom' as const, label: 'Custom', apps: '₹15', sub: 'per swipe', price: `₹${customSwipes * 15}`, popular: false, color: '#7C3AED' },
          ].map((plan) => (
            <Pressable
              key={plan.key}
              style={[styles.planBox, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }, selectedPlan === plan.key && { backgroundColor: plan.color, borderColor: plan.color, transform: [{ scale: 1.04 }] }, plan.popular && selectedPlan !== plan.key && styles.planBoxPopular]}
              onPress={() => setSelectedPlan(plan.key)}
            >
              {plan.popular && (
                <View style={styles.mostPopularBadge}>
                  <Star size={8} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.mostPopularText}>Most Popular</Text>
                </View>
              )}
              <Text style={[styles.planBoxLabel, { color: themeColors.textSecondary }, selectedPlan === plan.key && styles.planBoxLabelSelected]}>{plan.label}</Text>
              <Text style={[styles.planBoxApps, { color: themeColors.secondary }, selectedPlan === plan.key && styles.planBoxAppsSelected]}>{plan.apps}</Text>
              <Text style={[styles.planBoxSub, { color: themeColors.textTertiary }, selectedPlan === plan.key && styles.planBoxSubSelected]}>{plan.sub}</Text>
              {effectivePlan === plan.key && effectivePlan !== 'free' && (
                <View style={styles.planBoxCurrentBadge}>
                  <Text style={styles.planBoxCurrentText}>Current</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={[styles.planDetailCard, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
          {selectedPlan === 'pro' && (
            <>
              <View style={styles.planDetailNameRow}>
                <Text style={[styles.planDetailName, { color: themeColors.secondary }]}>Pro Plan</Text>
                <View style={styles.popularTag}>
                  <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.popularTagText}>Popular</Text>
                </View>
              </View>
              <Text style={[styles.planDetailPrice, { color: themeColors.accent }]}>₹1,999</Text>
              <Text style={[styles.planDetailDesc, { color: themeColors.textPrimary }]}>200 applications</Text>
              <Text style={[styles.planDetailNote, { color: themeColors.textSecondary }]}>AI auto-fill · Priority support · Profile boost</Text>
            </>
          )}
          {selectedPlan === 'premium' && (
            <>
              <View style={styles.planDetailNameRow}>
                <Text style={[styles.planDetailName, { color: themeColors.secondary }]}>Premium Plan</Text>
                <View style={styles.bestValueTag}>
                  <Text style={styles.bestValueText}>Best Value</Text>
                </View>
              </View>
              <Text style={[styles.planDetailPrice, { color: themeColors.accent }]}>₹7,599</Text>
              <Text style={[styles.planDetailDesc, { color: themeColors.textPrimary }]}>500 applications</Text>
              <Text style={[styles.planDetailNote, { color: themeColors.textSecondary }]}>AI auto-fill · Priority support · Profile boost</Text>
            </>
          )}
          {selectedPlan === 'custom' && (
            <>
              <Text style={[styles.planDetailName, { color: themeColors.secondary }]}>Custom Plan</Text>
              <Text style={[styles.planDetailPrice, { color: themeColors.accent }]}>₹{customSwipes * 15}</Text>
              <Text style={[styles.planDetailDesc, { color: themeColors.textPrimary }]}>One-time purchase · ₹15 per application</Text>
              <View style={[styles.sliderSection, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, { color: themeColors.secondary }]}>Number of swipes</Text>
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
                  width={SCREEN_WIDTH - 96}
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
                    : `${customSwipes} swipe${customSwipes > 1 ? 's' : ''} — ₹${customSwipes * 15}`}
                </Text>
              </View>
            </>
          )}
        </View>

        {selectedPlan !== 'custom' && effectivePlan !== 'premium' && (
          <View style={[styles.couponSection, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
            <View style={styles.couponInputRow}>
              <Ionicons name="pricetag-outline" size={20} color={themeColors.textSecondary} style={styles.couponIcon} />
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                placeholderTextColor={themeColors.textTertiary}
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

        {appliedCoupon && selectedPlan !== 'custom' && effectivePlan !== 'premium' && (
          <View style={[styles.priceBreakdown, { backgroundColor: themeColors.surfaceElevated }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Original Price:</Text>
              <Text style={[styles.priceValue, { color: themeColors.textPrimary }]}>₹{getPlanPriceInINR()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Discount:</Text>
              <Text style={styles.discountValue}>-₹{getPlanPriceInINR() - getFinalPrice()}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: themeColors.secondary }]}>Total:</Text>
              <Text style={styles.totalValue}>₹{getFinalPrice()}</Text>
            </View>
          </View>
        )}

        <View style={styles.whatYouGetSection}>
          <Text style={[styles.whatYouGetTitle, { color: themeColors.secondary }]}>What you get</Text>
          <View style={[styles.comparisonTable, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
            <View style={styles.compTableHeader}>
              <Text style={styles.compTableFeatureHeader}>Feature</Text>
              <Text style={styles.compTablePlanHeader}>Free</Text>
              <Text style={styles.compTablePlanHeader}>Pro</Text>
              <Text style={[styles.compTablePlanHeader, styles.compTablePremiumHeader]}>Premium</Text>
            </View>
            {COMPARISON_FEATURES.map((feat, idx) => (
              <View key={idx} style={[styles.compTableRow, idx % 2 === 0 && { backgroundColor: themeColors.surfaceElevated }]}>
                <Text style={[styles.compTableFeature, { color: themeColors.textSecondary }]}>{feat.label}</Text>
                <View style={styles.compTableCell}>
                  {typeof feat.free === 'string' ? (
                    <Text style={[styles.compTableValue, { color: themeColors.textPrimary }]}>{feat.free}</Text>
                  ) : feat.free ? (
                    <Check size={16} color={themeColors.accent} />
                  ) : (
                    <XIcon size={16} color={themeColors.textTertiary} />
                  )}
                </View>
                <View style={styles.compTableCell}>
                  {typeof feat.pro === 'string' ? (
                    <Text style={[styles.compTableValue, { color: themeColors.textPrimary }]}>{feat.pro}</Text>
                  ) : feat.pro ? (
                    <Check size={16} color={themeColors.accent} />
                  ) : (
                    <XIcon size={16} color={themeColors.textTertiary} />
                  )}
                </View>
                <View style={styles.compTableCell}>
                  {typeof feat.premium === 'string' ? (
                    <Text style={[styles.compTableValue, styles.compTablePremiumValue, { color: themeColors.accent }]}>{feat.premium}</Text>
                  ) : feat.premium ? (
                    <Check size={16} color={themeColors.accent} />
                  ) : (
                    <XIcon size={16} color={themeColors.textTertiary} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.testimonialSectionTitle, { color: themeColors.secondary }]}>What our users say</Text>
        <View style={styles.testimonialCarouselWrap}>
          <LinearGradient colors={['#121212', 'transparent']} style={styles.testimonialFadeTop} pointerEvents="none" />
          <Animated.View style={{ transform: [{ translateY: testimonialScrollY }] }}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <View key={idx} style={styles.testimonialCard}>
                <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.2)" style={styles.testimonialQuoteIcon} />
                <Text style={styles.testimonialQuote} numberOfLines={2}>"{t.quote}"</Text>
                <View style={styles.testimonialFooter}>
                  <Image source={t.avatar} style={styles.testimonialAvatar} />
                  <View style={styles.testimonialInfo}>
                    <Text style={styles.testimonialName}>{t.name}</Text>
                    <Text style={styles.testimonialRole}>{t.role}</Text>
                  </View>
                  <View style={styles.testimonialStars}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={12} color="#FFD700" fill="#FFD700" />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
          <LinearGradient colors={['transparent', '#121212']} style={styles.testimonialFadeBottom} pointerEvents="none" />
        </View>
            </View>
          ) : (
            <View>
          <View style={[styles.subMgmtCard, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
            <Text style={[styles.subMgmtTitle, { color: themeColors.secondary }]}>Your Subscription</Text>

            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Crown size={16} color={currentSubscription === 'premium' ? '#E65100' : '#1565C0'} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Plan</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.textPrimary }]}>{currentSubscription.charAt(0).toUpperCase() + currentSubscription.slice(1)}</Text>
            </View>

            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Ionicons name="refresh" size={16} color={getStatusColor(subscriptionStatus)} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Status</Text>
              </View>
              <View style={[styles.subStatusBadge, { backgroundColor: getStatusColor(subscriptionStatus) + '20' }]}>
                <View style={[styles.subStatusDot, { backgroundColor: getStatusColor(subscriptionStatus) }]} />
                <Text style={[styles.subStatusText, { color: getStatusColor(subscriptionStatus) }]}>{getStatusLabel(subscriptionStatus)}</Text>
              </View>
            </View>

            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Zap size={16} color="#7C3AED" />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Swipes Remaining</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.accent, fontWeight: '800' }]}>{subscriptionData?.applications_remaining ?? 0} / {subscriptionData?.applications_limit ?? 0}</Text>
            </View>

            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Billing Cycle</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.textPrimary }]}>Monthly</Text>
            </View>

            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Ionicons name="card-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>{subscriptionStatus === 'cancelled' ? 'Expires On' : 'Next Billing'}</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.textPrimary }]}>{formatDate(subscriptionData?.subscription_end_date ?? null)}</Text>
            </View>

            {subscriptionStatus === 'payment_failed' && (
              <View style={styles.subWarningBanner}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.subWarningText}>Your last payment failed. You've been downgraded to Free but your remaining swipes are preserved.</Text>
              </View>
            )}

            {subscriptionStatus !== 'cancelled' && subscriptionStatus !== 'payment_failed' && (
              <Pressable style={styles.subCancelBtn} onPress={handleCancelSubscription} disabled={isCancelling}>
                {isCancelling ? (
                  <ActivityIndicator color="#EF4444" size="small" />
                ) : (
                  <Text style={styles.subCancelText}>Cancel Subscription</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* ─── Transaction History (always visible, below subscription) ─── */}
        <View style={[styles.subMgmtCard, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
          <View style={styles.subTxTitleRow}>
            <Text style={[styles.subMgmtTitle, { color: themeColors.secondary, marginBottom: 0 }]}>Transaction History</Text>
            <Pressable onPress={handleRefreshTransactions} disabled={isRefreshingTx} style={styles.subTxRefreshBtn}>
              {isRefreshingTx ? (
                <ActivityIndicator size="small" color="#B0B0B0" />
              ) : (
                <Ionicons name="refresh" size={16} color="#B0B0B0" />
              )}
            </Pressable>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.subTxEmpty}>
              <Ionicons name="card-outline" size={24} color="#808080" />
              <Text style={styles.subTxEmptyText}>No transactions yet</Text>
              <Text style={styles.subTxEmptySubtext}>Your payment history will appear here</Text>
            </View>
          ) : (
            transactions.map((tx: TransactionRecord) => (
              <View key={tx.id} style={[styles.subTxRow, { borderBottomColor: themeColors.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subTxPlan, { color: themeColors.textPrimary }]}>{tx.subscription_type.charAt(0).toUpperCase() + tx.subscription_type.slice(1)}</Text>
                  <Text style={[styles.subTxDate, { color: themeColors.textTertiary }]}>{formatDate(tx.created_at)}{tx.payment_id ? ` · ${tx.payment_id.slice(0, 14)}...` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' as const }}>
                  <Text style={[styles.subTxAmount, { color: themeColors.textPrimary }]}>₹{tx.amount}</Text>
                  <View style={[styles.subTxStatusBadge, { backgroundColor: tx.status === 'completed' ? '#10B98120' : tx.status === 'failed' ? '#EF444420' : tx.status === 'abandoned' ? '#6B728020' : '#F59E0B20' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700' as const, color: tx.status === 'completed' ? '#10B981' : tx.status === 'failed' ? '#EF4444' : tx.status === 'abandoned' ? '#6B7280' : '#F59E0B' }}>
                      {tx.status === 'completed' ? 'Success' : tx.status === 'failed' ? 'Failed' : tx.status === 'abandoned' ? 'Abandoned' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
        </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {activeTab === 'plans' && (
        <View style={[styles.stickyCtaBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: '#1E1E1E', borderTopColor: '#2A2A2A' }]}>
          <View style={styles.stickyCtaPriceCol}>
            <Text style={[styles.stickyCtaPriceLabel, { color: themeColors.textSecondary }]}>{selectedPlan === 'custom' ? 'Custom' : selectedPlan === 'pro' ? 'Pro' : 'Premium'}</Text>
            <Text style={[styles.stickyCtaPrice, { color: themeColors.secondary }]}>₹{getFinalPrice()}</Text>
          </View>
          <Pressable
            style={[styles.stickyCtaBtn, isCtaDisabled && styles.subscribeBtnDisabled]}
            onPress={handleSubscribe}
            disabled={isCtaDisabled}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isVerifying ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.subscribeBtnText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.subscribeBtnText}>{getCtaLabel()}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: undefined },
  heroGradient: { paddingHorizontal: 16, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  banner: { width: SCREEN_WIDTH - 32, height: 180, borderRadius: 16, marginBottom: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 8, marginBottom: 0 },
  heroTitle: { fontSize: 26, fontWeight: '900' as const, textAlign: 'center' },
  heroSubtext: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  heroHighlight: { color: '#E65100', fontWeight: '800' as const },
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
  pricingSectionTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 14, marginTop: 20 },
  planBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.borderLight, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, overflow: 'visible' as const },
  planBoxSelected: { borderColor: '#111111', backgroundColor: '#111111', transform: [{ scale: 1.04 }] },
  planBoxPopular: { borderColor: '#1565C0', shadowColor: '#1565C0', shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  mostPopularBadge: { position: 'absolute' as const, top: -10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1565C0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, zIndex: 1 },
  mostPopularText: { fontSize: 9, fontWeight: '700' as const, color: '#FFFFFF' },
  planBoxLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.textSecondary, marginBottom: 4 },
  planBoxLabelSelected: { color: 'rgba(255,255,255,0.7)' },
  planBoxApps: { fontSize: 28, fontWeight: '900' as const, color: Colors.secondary },
  planBoxAppsSelected: { color: '#FFFFFF' },
  planBoxSub: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  planBoxSubSelected: { color: 'rgba(255,255,255,0.5)' },
  planBoxCurrentBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  planBoxCurrentText: { fontSize: 9, fontWeight: '700' as const, color: '#FFFFFF' },
  planDetailCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  planDetailNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planDetailName: { fontSize: 18, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 4 },
  planDetailPrice: { fontSize: 28, fontWeight: '900' as const, color: Colors.accent, marginBottom: 8 },
  planDetailDesc: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary, marginBottom: 4 },
  planDetailNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  popularTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1565C0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  popularTagText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  bestValueTag: { backgroundColor: Colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bestValueText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  stickyCtaBar: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10, gap: 12 },
  stickyCtaPriceCol: { alignItems: 'flex-start' as const },
  stickyCtaPriceLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' as const },
  stickyCtaPrice: { fontSize: 22, fontWeight: '900' as const, color: Colors.secondary },
  stickyCtaBtn: { flex: 1, backgroundColor: '#111111', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
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

  testimonialSectionTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.secondary, marginBottom: 14 },
  testimonialCarouselWrap: { height: (TESTIMONIAL_HEIGHT + TESTIMONIAL_GAP) * 3, overflow: 'hidden' as const, marginBottom: 24, position: 'relative' as const },
  testimonialFadeTop: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  testimonialFadeBottom: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  testimonialCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, height: TESTIMONIAL_HEIGHT, marginBottom: TESTIMONIAL_GAP, position: 'relative' as const, overflow: 'hidden' as const, justifyContent: 'space-between' as const },
  testimonialQuoteIcon: { position: 'absolute' as const, top: 14, right: 16 },
  testimonialQuote: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' as const, lineHeight: 22, marginBottom: 10 },
  testimonialFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  testimonialInfo: { flex: 1 },
  testimonialName: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  testimonialRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  testimonialStars: { flexDirection: 'row', gap: 2 },

  couponSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: { marginLeft: 2 },
  couponInput: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', paddingVertical: 8 },
  applyCouponBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  applyCouponText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
  removeCouponBtn: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  couponAppliedText: { fontSize: 13, color: '#10B981', fontWeight: '600' as const },
  priceBreakdown: { backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  priceValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary },
  discountValue: { fontSize: 14, fontWeight: '700' as const, color: '#10B981' },
  totalRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '700' as const, color: Colors.secondary },
  totalValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.accent },

  sliderSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sliderLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.secondary },
  swipeCountBadge: { backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  swipeCountText: { fontSize: 16, fontWeight: '800' as const, color: '#FFFFFF' },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderRangeText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' as const },
  sliderHelperText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 10 },

  // Subscription Management
  tabBar: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 14, padding: 4, marginTop: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '700' as const, color: '#808080' },
  tabTextActive: { color: '#111111' },
  subMgmtCard: { borderRadius: 16, padding: 20, marginTop: 20, marginBottom: 8, borderWidth: 1 },
  subMgmtTitle: { fontSize: 20, fontWeight: '800' as const, marginBottom: 16 },
  subMgmtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' },
  subMgmtLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subMgmtLabel: { fontSize: 13, fontWeight: '600' as const },
  subMgmtValue: { fontSize: 13, fontWeight: '700' as const },
  subStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  subStatusDot: { width: 6, height: 6, borderRadius: 3 },
  subStatusText: { fontSize: 11, fontWeight: '700' as const },
  subWarningBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3A1B1B', borderRadius: 10, padding: 12, marginTop: 12 },
  subWarningText: { flex: 1, fontSize: 12, color: '#EF4444', lineHeight: 18 },
  subTxSection: { marginTop: 16 },
  subTxTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subTxTitle: { fontSize: 15, fontWeight: '700' as const },
  subTxRefreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  subTxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  subTxPlan: { fontSize: 13, fontWeight: '600' as const },
  subTxDate: { fontSize: 11, marginTop: 2 },
  subTxAmount: { fontSize: 14, fontWeight: '700' as const },
  subTxStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  subTxEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  subTxEmptyText: { fontSize: 14, fontWeight: '600' as const, color: '#808080' },
  subTxEmptySubtext: { fontSize: 12, color: '#606060' },
  subCancelBtn: { marginTop: 16, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  subCancelText: { fontSize: 14, fontWeight: '700' as const, color: '#EF4444' },
});
