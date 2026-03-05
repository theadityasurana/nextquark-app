export async function POST(request: Request) {
  try {
    const { amount, currency, planType, billingCycle } = await request.json();

    // TODO: Replace with your actual Razorpay Key Secret
    const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || 'Py9XEXKQhScekTPPXOH7xOA5';
    const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_SMzoT0e5YvEGon';

    const orderData = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency || 'INR',
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
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error?.description || 'Failed to create order');
    }

    return Response.json({ success: true, order });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
