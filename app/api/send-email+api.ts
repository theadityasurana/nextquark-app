const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY || '';

export async function POST(request: Request) {
  try {
    const { from, to, subject, body } = await request.json();

    if (!from || !to || !subject) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log('Resend send error:', err);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ success: true, id: data.id });
  } catch (e) {
    console.log('Send email API error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
