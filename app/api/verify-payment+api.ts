import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    // TODO: Replace with your actual Razorpay Key Secret
    const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || 'Py9XEXKQhScekTPPXOH7xOA5';

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      // TODO: Update user subscription in your database here
      return Response.json({ success: true, message: 'Payment verified successfully' });
    } else {
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
