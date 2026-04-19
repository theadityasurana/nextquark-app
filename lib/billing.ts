import { Platform } from 'react-native';

let IAP: typeof import('react-native-iap') | null = null;

try {
  IAP = require('react-native-iap');
} catch {
  if (__DEV__) console.log('react-native-iap not available (Expo Go), billing disabled');
}

// Product IDs — must match App Store Connect and Google Play Console
export const SUBSCRIPTION_SKUS = {
  premium_monthly: 'nq_premium_monthly',
  premium_weekly: 'nq_premium_weekly',
};



let isConnected = false;

export async function setupBilling(): Promise<boolean> {
  if (Platform.OS === 'web' || !IAP) return false;
  try {
    await IAP.initConnection();
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Failed to connect to billing:', error);
    return false;
  }
}

export async function teardownBilling(): Promise<void> {
  if (isConnected && IAP) {
    await IAP.endConnection();
    isConnected = false;
  }
}

export async function fetchSubscriptions() {
  if (!IAP) return [];
  try {
    return await IAP.fetchProducts({
      skus: [SUBSCRIPTION_SKUS.premium_monthly, SUBSCRIPTION_SKUS.premium_weekly],
      type: 'subs',
    });
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return [];
  }
}



export async function buySubscription(sku: string, offerToken?: string): Promise<boolean> {
  if (!IAP) return false;
  try {
    await IAP.requestPurchase({
      request: {
        google: {
          skus: [sku],
          ...(offerToken && { subscriptionOffers: [{ sku, offerToken }] }),
        },
        apple: { sku },
      },
      type: 'subs',
    });
    return true;
  } catch (error) {
    console.error('Subscription purchase failed:', error);
    return false;
  }
}



export async function acknowledgePurchase(purchase: any): Promise<void> {
  if (!IAP) return;
  try {
    await IAP.finishTransaction({ purchase, isConsumable: false });
  } catch (error) {
    console.error('Failed to acknowledge purchase:', error);
  }
}



export async function restorePurchases() {
  if (!IAP) return [];
  try {
    return await IAP.getAvailablePurchases();
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return [];
  }
}

// Re-export types and listeners (safe — these are just type/value references)
export type ProductPurchase = import('react-native-iap').Purchase;
export type SubscriptionPurchase = import('react-native-iap').Purchase;
export type PurchaseError = import('react-native-iap').PurchaseError;

export function isBillingAvailable(): boolean {
  return IAP !== null;
}

export const purchaseUpdatedListener = IAP?.purchaseUpdatedListener ?? (() => ({ remove: () => {} }));
export const purchaseErrorListener = IAP?.purchaseErrorListener ?? (() => ({ remove: () => {} }));
