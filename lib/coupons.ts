// Coupon codes configuration
export interface Coupon {
  code: string;
  discount: number; // percentage (0-100) or fixed amount
  type: 'percentage' | 'fixed';
  description: string;
  expiryDate?: Date;
  maxUses?: number;
  usedCount?: number;
}

// Predefined coupons
const COUPONS: Coupon[] = [
  {
    code: 'FREE100',
    discount: 100,
    type: 'percentage',
    description: 'Get 100% off - Free subscription!',
  },
  {
    code: 'LAUNCH50',
    discount: 50,
    type: 'percentage',
    description: 'Launch offer - 50% off',
  },
  {
    code: 'SAVE500',
    discount: 500,
    type: 'fixed',
    description: 'Save ₹500 on your subscription',
  },
];

export function validateCoupon(code: string): Coupon | null {
  const coupon = COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
  
  if (!coupon) return null;
  
  // Check expiry
  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    return null;
  }
  
  // Check max uses
  if (coupon.maxUses && coupon.usedCount && coupon.usedCount >= coupon.maxUses) {
    return null;
  }
  
  return coupon;
}

export function calculateDiscountedPrice(originalPrice: number, coupon: Coupon): number {
  if (coupon.type === 'percentage') {
    const discount = (originalPrice * coupon.discount) / 100;
    return Math.max(0, originalPrice - discount);
  } else {
    return Math.max(0, originalPrice - coupon.discount);
  }
}
