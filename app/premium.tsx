import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated, Alert, ActivityIndicator, TextInput, Image, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Crown, Check, X as XIcon, Zap, Star } from '@/components/ProfileIcons';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';

import { activateSubscription, getSubscriptionStatus, getTransactionHistory, cancelSubscription, recordPaymentAttempt, updatePaymentStatus, markAbandonedPayments, type TransactionRecord } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendSubscriptionNotification } from '@/lib/notifications';
import {
  setupBilling,
  teardownBilling,
  buySubscription,
  acknowledgePurchase,
  restorePurchases,
  fetchSubscriptions,
  purchaseUpdatedListener,
  purchaseErrorListener,
  isBillingAvailable,
  SUBSCRIPTION_SKUS,
  type ProductPurchase,
  type SubscriptionPurchase,
  type PurchaseError,
} from '@/lib/billing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPARISON_FEATURES = [
  { label: 'Job applications', free: '10/day', premium: 'Unlimited' },
  { label: 'Resume uploads', free: '1', premium: '3' },
  { label: 'AI auto-fill', free: true, premium: true },
  { label: 'Priority support', free: false as const, premium: true },
  { label: 'Profile visibility boost', free: false as const, premium: true },
];

const TESTIMONIAL_GAP = 12;

const TESTIMONIALS = [
  { quote: 'Apply to hundreds of jobs with a single swipe — save hours every week.' },
  { quote: 'AI auto-fill handles repetitive application fields so you can focus on what matters.' },
  { quote: 'Get your profile seen by more recruiters with enhanced visibility.' },
  { quote: 'Upload multiple resumes and use the right one for each application.' },
  { quote: 'Priority support means faster responses when you need help.' },
  { quote: 'Track all your applications in one place with real-time status updates.' },
  { quote: 'Smart matching connects you with roles that fit your skills and preferences.' },
  { quote: 'Get notified instantly when new jobs match your profile.' },
  { quote: 'Manage your job search on the go with a fully mobile experience.' },
  { quote: 'Your data is encrypted and secure — we never share your information.' },
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'weekly'>('monthly');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const testimonialScrollY = useRef(new Animated.Value(0)).current;
  const [isRefreshingTx, setIsRefreshingTx] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscription'>('plans');
  const pendingPaymentRef = useRef<{ billingCycle: string; amount: number; recordId?: string } | null>(null);
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);

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

  // Handle Google Play purchase updates
  const handlePurchaseUpdate = useCallback(async (purchase: ProductPurchase | SubscriptionPurchase) => {
    if (!supabaseUserId) return;
    setIsVerifying(true);
    try {
      const pending = pendingPaymentRef.current;
      const purchaseToken = purchase.purchaseToken || purchase.transactionId || '';

      // Acknowledge the subscription purchase
      await acknowledgePurchase(purchase);

      // Record in Supabase
      if (pending?.recordId) {
        await updatePaymentStatus(pending.recordId, 'completed', purchaseToken);
      }

      const result = await activateSubscription(supabaseUserId, 'premium', purchaseToken, purchase.productId, pending?.amount || 0, undefined, purchaseToken);

      pendingPaymentRef.current = null;
      await refetchTransactions();

      if (result.success) {
        await sendSubscriptionNotification('premium');
        await refetchSubscription();
        queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
        Alert.alert(
          'Subscription Activated! 🎉',
          'You are now a Premium member with unlimited applications!',
          [{ text: 'OK', onPress: navigateAfterSubscription }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to activate subscription. Please contact support.');
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process purchase. Please contact support.');
    } finally {
      setIsVerifying(false);
    }
  }, [supabaseUserId, refetchSubscription, refetchTransactions, queryClient]);

  const handlePurchaseError = useCallback((error: PurchaseError) => {
    if (error.code === ('E_USER_CANCELLED' as any) || error.code === 'user-cancelled') return;
    console.error('Purchase error:', error);
    const pending = pendingPaymentRef.current;
    if (pending?.recordId) {
      updatePaymentStatus(pending.recordId, 'failed');
    }
    pendingPaymentRef.current = null;
    setIsProcessing(false);
    Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
  }, []);

  // Initialize billing and listeners
  useEffect(() => {
    const init = async () => {
      await setupBilling();
      await fetchSubscriptions();
    };
    init();
    purchaseUpdateSubscription.current = purchaseUpdatedListener(handlePurchaseUpdate);
    purchaseErrorSubscription.current = purchaseErrorListener(handlePurchaseError);

    return () => {
      purchaseUpdateSubscription.current?.remove();
      purchaseErrorSubscription.current?.remove();
      teardownBilling();
    };
  }, [handlePurchaseUpdate, handlePurchaseError]);

  // Mark stale pending payments as abandoned on mount
  useEffect(() => {
    if (supabaseUserId) {
      markAbandonedPayments(supabaseUserId).then(() => refetchTransactions());
    }
  }, [supabaseUserId]);

  useEffect(() => {
    const itemTotal = 80 + TESTIMONIAL_GAP;
    const totalScroll = TESTIMONIALS.length * itemTotal;
    Animated.loop(
      Animated.timing(testimonialScrollY, {
        toValue: -totalScroll,
        duration: TESTIMONIALS.length * 3500,
        useNativeDriver: true,
      })
    ).start();
  }, []);



  const getPlanPrice = () => {
    return billingCycle === 'monthly' ? 3599 : 999;
  };

  const handleSubscribe = async () => {
    if (effectivePlan === 'premium') {
      Alert.alert('Already Premium', 'You are already on the Premium plan.');
      return;
    }

    setIsProcessing(true);

    try {
      const finalAmountINR = getPlanPrice();

      if (!isBillingAvailable()) {
        Alert.alert(
          'Purchases Unavailable',
          'In-app purchases are not available on this device. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to subscribe');
        return;
      }

      const attempt = await recordPaymentAttempt(
        user.id,
        'premium',
        finalAmountINR,
      );

      pendingPaymentRef.current = {
        billingCycle,
        amount: finalAmountINR,
        recordId: attempt.recordId,
      };

      const sku = billingCycle === 'monthly' ? SUBSCRIPTION_SKUS.premium_monthly : SUBSCRIPTION_SKUS.premium_weekly;
      const success = await buySubscription(sku);
      if (!success) {
        if (attempt.recordId) await updatePaymentStatus(attempt.recordId, 'failed');
        pendingPaymentRef.current = null;
        await refetchTransactions();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!supabaseUserId) return;
    setIsRestoring(true);
    try {
      const purchases = await restorePurchases();
      if (purchases.length === 0) {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
        return;
      }
      const subPurchase = purchases.find(
        (p) => p.productId === SUBSCRIPTION_SKUS.premium_monthly || p.productId === SUBSCRIPTION_SKUS.premium_weekly
      );
      if (subPurchase) {
        const token = subPurchase.purchaseToken || subPurchase.transactionId || '';
        await activateSubscription(supabaseUserId, 'premium', token, subPurchase.productId, 0, undefined, token);
        await refetchSubscription();
        queryClient.invalidateQueries({ queryKey: ['subscription-status', supabaseUserId] });
        Alert.alert('Purchases Restored! 🎉', 'Your Premium subscription has been restored.');
      } else {
        Alert.alert('No Subscriptions Found', 'We could not find an active Premium subscription to restore.');
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!supabaseUserId) return;
    Alert.alert(
      'Cancel Subscription',
      Platform.OS === 'ios'
        ? 'To cancel your subscription, go to Settings → Apple ID → Subscriptions → NextQuark → Cancel.'
        : 'To cancel your subscription, go to Google Play Store → Menu → Subscriptions → NextQuark → Cancel.',
      [
        { text: 'OK', style: 'default' },
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
    if (effectivePlan === 'premium') return 'Current Plan';
    return `Subscribe for ₹${getPlanPrice()}/${billingCycle === 'monthly' ? 'month' : 'week'}`;
  };

  const isAlreadyPremium = effectivePlan === 'premium';
  const isCtaDisabled = isProcessing || isVerifying || isAlreadyPremium;

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
              <Text style={[styles.heroSubtext, { color: themeColors.textSecondary }]}>Upgrade to unlock <Text style={styles.heroHighlight}>unlimited applications</Text> and premium features</Text>
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
          {effectivePlan === 'premium' ? 'Your Current Plan' : 'Go Premium'}
        </Text>

        {/* Billing cycle toggle */}
        <View style={styles.planBoxRow}>
          <Pressable
            style={[styles.planBox, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }, billingCycle === 'weekly' && { backgroundColor: '#E65100', borderColor: '#E65100', transform: [{ scale: 1.04 }] }]}
            onPress={() => setBillingCycle('weekly')}
          >
            <Text style={[styles.planBoxLabel, { color: themeColors.textSecondary }, billingCycle === 'weekly' && styles.planBoxLabelSelected]}>Weekly</Text>
            <Text style={[styles.planBoxApps, { color: themeColors.secondary }, billingCycle === 'weekly' && styles.planBoxAppsSelected]}>₹999</Text>
            <Text style={[styles.planBoxSub, { color: themeColors.textTertiary }, billingCycle === 'weekly' && styles.planBoxSubSelected]}>per week</Text>
          </Pressable>
          <Pressable
            style={[styles.planBox, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }, billingCycle === 'monthly' && { backgroundColor: '#E65100', borderColor: '#E65100', transform: [{ scale: 1.04 }] }]}
            onPress={() => setBillingCycle('monthly')}
          >
            <View style={styles.mostPopularBadge}>
              <Star size={8} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.mostPopularText}>Best Value</Text>
            </View>
            <Text style={[styles.planBoxLabel, { color: themeColors.textSecondary }, billingCycle === 'monthly' && styles.planBoxLabelSelected]}>Monthly</Text>
            <Text style={[styles.planBoxApps, { color: themeColors.secondary }, billingCycle === 'monthly' && styles.planBoxAppsSelected]}>₹3,599</Text>
            <Text style={[styles.planBoxSub, { color: themeColors.textTertiary }, billingCycle === 'monthly' && styles.planBoxSubSelected]}>per month</Text>
          </Pressable>
        </View>

        <View style={[styles.planDetailCard, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
          <View style={styles.planDetailNameRow}>
            <Text style={[styles.planDetailName, { color: themeColors.secondary }]}>Premium Plan</Text>
            <View style={styles.bestValueTag}>
              <Text style={styles.bestValueText}>Unlimited</Text>
            </View>
          </View>
          <Text style={[styles.planDetailPrice, { color: themeColors.accent }]}>₹{billingCycle === 'monthly' ? '3,599/month' : '999/week'}</Text>
          <Text style={[styles.planDetailDesc, { color: themeColors.textPrimary }]}>Unlimited applications · 3 resumes</Text>
          <Text style={[styles.planDetailNote, { color: themeColors.textSecondary }]}>AI auto-fill · Priority support · Profile boost</Text>
          {effectivePlan === 'premium' && (
            <View style={styles.planBoxCurrentBadge}>
              <Text style={styles.planBoxCurrentText}>Current</Text>
            </View>
          )}
        </View>

        <View style={styles.whatYouGetSection}>
          <Text style={[styles.whatYouGetTitle, { color: themeColors.secondary }]}>What you get</Text>
          <View style={[styles.comparisonTable, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
            <View style={styles.compTableHeader}>
              <Text style={styles.compTableFeatureHeader}>Feature</Text>
              <Text style={styles.compTablePlanHeader}>Free</Text>
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

        <Text style={[styles.testimonialSectionTitle, { color: themeColors.secondary }]}>How it works</Text>
        <View style={styles.testimonialCarouselWrap}>
          <LinearGradient colors={['#121212', 'transparent']} style={styles.testimonialFadeTop} pointerEvents="none" />
          <Animated.View style={{ transform: [{ translateY: testimonialScrollY }] }}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <View key={idx} style={styles.testimonialCard}>
                <Text style={styles.testimonialQuote}>{t.quote}</Text>
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
                <Crown size={16} color={currentSubscription === 'premium' ? '#E65100' : '#757575'} />
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
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Applications</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.accent, fontWeight: '800' }]}>{currentSubscription === 'premium' ? 'Unlimited' : '10 / day'}</Text>
            </View>

            {currentSubscription === 'premium' && (
            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>Billing Cycle</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.textPrimary }]}>{subscriptionData?.subscription_end_date ? (new Date(subscriptionData.subscription_end_date).getTime() - new Date(subscriptionData.subscription_start_date || '').getTime() <= 8 * 24 * 60 * 60 * 1000 ? 'Weekly' : 'Monthly') : '—'}</Text>
            </View>
            )}

            {currentSubscription === 'premium' && (
            <View style={styles.subMgmtRow}>
              <View style={styles.subMgmtLabelRow}>
                <Ionicons name="card-outline" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.subMgmtLabel, { color: themeColors.textSecondary }]}>{subscriptionStatus === 'cancelled' ? 'Expires On' : 'Next Billing'}</Text>
              </View>
              <Text style={[styles.subMgmtValue, { color: themeColors.textPrimary }]}>{formatDate(subscriptionData?.subscription_end_date ?? null)}</Text>
            </View>
            )}

            {subscriptionStatus === 'payment_failed' && (
              <View style={styles.subWarningBanner}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.subWarningText}>Your last payment failed. You've been downgraded to Free but your remaining swipes are preserved.</Text>
              </View>
            )}

            {currentSubscription === 'premium' && subscriptionStatus !== 'cancelled' && subscriptionStatus !== 'payment_failed' && (
              <Pressable style={styles.subCancelBtn} onPress={handleCancelSubscription} disabled={isCancelling}>
                {isCancelling ? (
                  <ActivityIndicator color="#EF4444" size="small" />
                ) : (
                  <Text style={styles.subCancelText}>Cancel Subscription</Text>
                )}
              </Pressable>
            )}
          </View>

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

          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      {activeTab === 'plans' && (
        <View style={[styles.stickyCtaBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: '#1E1E1E', borderTopColor: '#2A2A2A' }]}>
          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.stickyCtaPriceCol}>
                <Text style={[styles.stickyCtaPriceLabel, { color: themeColors.textSecondary }]}>Premium</Text>
                <Text style={[styles.stickyCtaPrice, { color: themeColors.secondary }]}>₹{getPlanPrice()}</Text>
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
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => Linking.openURL('https://nextquark.framer.website/privacy')}>
                <Text style={{ fontSize: 11, color: '#808080' }}>Privacy Policy</Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: '#555' }}>•</Text>
              <Pressable onPress={() => Linking.openURL('https://nextquark.framer.website/terms')}>
                <Text style={{ fontSize: 11, color: '#808080' }}>Terms of Use</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'plans' && Platform.OS === 'ios' && (
        <Pressable
          style={[styles.restoreBtn, { bottom: Math.max(insets.bottom, 16) + 68 }]}
          onPress={handleRestorePurchases}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color="#B0B0B0" size="small" />
          ) : (
            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          )}
        </Pressable>
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
  testimonialCarouselWrap: { height: 80 * 3, overflow: 'hidden' as const, marginBottom: 24, position: 'relative' as const },
  testimonialFadeTop: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  testimonialFadeBottom: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 30, zIndex: 2 },
  testimonialCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, marginBottom: TESTIMONIAL_GAP, justifyContent: 'center' as const },
  testimonialQuote: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' as const, lineHeight: 22 },


  testimonialStars: { flexDirection: 'row', gap: 2 },




  sliderSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },


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
  restoreBtn: { position: 'absolute' as const, left: 0, right: 0, alignItems: 'center', paddingVertical: 8 },
  restoreBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#808080', textDecorationLine: 'underline' as const },
});
