import { Platform } from 'react-native';

let IAP: typeof import('react-native-iap') | null = null;

try {
  IAP = require('react-native-iap');
} catch {
  if (__DEV__) console.log('react-native-iap not available (Expo Go), billing disabled');
}

// Product IDs — must match App Store Connect and Google Play Console
export const SUBSCRIPTION_SKUS = {
  pro: 'nq_pro',
  premium: 'nq_premium',
};

export const PRODUCT_SKUS = {
  swipes_5: 'nq_5swipes',
  swipes_10: 'nq_10swipes',
  swipes_25: 'nq_25swipes',
  swipes_50: 'nq_50swipes',
};

// Map swipe counts to product IDs
export function getSwipeProductId(count: number): string | null {
  if (count <= 5) return PRODUCT_SKUS.swipes_5;
  if (count <= 10) return PRODUCT_SKUS.swipes_10;
  if (count <= 25) return PRODUCT_SKUS.swipes_25;
  if (count <= 50) return PRODUCT_SKUS.swipes_50;
  return null;
}

// Swipe counts per product
export const SWIPE_PRODUCTS: { id: string; count: number; price: number }[] = [
  { id: PRODUCT_SKUS.swipes_5, count: 5, price: 75 },
  { id: PRODUCT_SKUS.swipes_10, count: 10, price: 150 },
  { id: PRODUCT_SKUS.swipes_25, count: 25, price: 375 },
  { id: PRODUCT_SKUS.swipes_50, count: 50, price: 750 },
];

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
      skus: [SUBSCRIPTION_SKUS.pro, SUBSCRIPTION_SKUS.premium],
      type: 'subs',
    });
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return [];
  }
}

export async function fetchSwipeProducts() {
  if (!IAP) return [];
  try {
    return await IAP.fetchProducts({ skus: Object.values(PRODUCT_SKUS) });
  } catch (error) {
    console.error('Failed to fetch products:', error);
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

export async function buyProduct(sku: string): Promise<boolean> {
  if (!IAP) return false;
  try {
    await IAP.requestPurchase({
      request: {
        google: { skus: [sku] },
        apple: { sku },
      },
      type: 'in-app',
    });
    return true;
  } catch (error) {
    console.error('Product purchase failed:', error);
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

export async function consumePurchase(purchase: any): Promise<void> {
  if (!IAP) return;
  try {
    await IAP.finishTransaction({ purchase, isConsumable: true });
  } catch (error) {
    console.error('Failed to consume purchase:', error);
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
