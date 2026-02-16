import { NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import { getStripe } from '@/lib/stripe';

const ELIGIBLE_PLEDGE_PLANS = new Set(['code_pro', 'code_max']);
const ELIGIBLE_SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
]);

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const checkoutSessionId =
    typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';

  if (!checkoutSessionId) {
    return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  }

  const stripe = getStripe();

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['subscription'],
    });
  } catch {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  const plan = checkoutSession.metadata?.plan ?? '';
  const billingCycle = checkoutSession.metadata?.cycle ?? null;
  const checkoutUserId =
    checkoutSession.client_reference_id || checkoutSession.metadata?.userId || null;
  const subscription = checkoutSession.subscription;

  const isEligible =
    checkoutSession.status === 'complete' &&
    checkoutSession.mode === 'subscription' &&
    checkoutSession.metadata?.source === 'umans-code-pledge' &&
    checkoutUserId === userId &&
    ELIGIBLE_PLEDGE_PLANS.has(plan) &&
    Boolean(
      subscription &&
        typeof subscription !== 'string' &&
        ELIGIBLE_SUBSCRIPTION_STATUSES.has(subscription.status),
    );

  return NextResponse.json({
    eligible: isEligible,
    sessionId: checkoutSession.id,
    plan: ELIGIBLE_PLEDGE_PLANS.has(plan) ? plan : null,
    billingCycle,
  });
}
