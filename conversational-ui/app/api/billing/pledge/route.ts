import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { type BillingCycle, getPriceId, getStripe } from '@/lib/stripe';
import { getLatestPledgeForUser, getUser } from '@/lib/db/queries';
import {
  PLEDGE_CHARGE_START_TIMESTAMP,
  PLEDGE_CHARGE_START_LABEL,
} from '@/lib/pledge';

// Stripe requires trial_end to be at least 2 days in the future
const MIN_TRIAL_DAYS = 2;
const MIN_TRIAL_SECONDS = MIN_TRIAL_DAYS * 24 * 60 * 60;

type PledgePlanKey = 'code_pro' | 'code_max';

export async function POST(req: Request) {
  const {
    plan,
    cycle,
    returnTo,
    source,
  }: {
    plan: PledgePlanKey;
    cycle: BillingCycle;
    returnTo?: string;
    source?: 'landing' | 'billing';
  } = await req.json();

  if (plan !== 'code_pro' && plan !== 'code_max') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  if (cycle !== 'monthly' && cycle !== 'yearly') {
    return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    const fallbackReturnTo = `/offers/code?pledgePlan=${plan}&pledgeCycle=${cycle}#plans`;
    const safeReturnTo =
      typeof returnTo === 'string' && returnTo.startsWith('/')
        ? returnTo
        : fallbackReturnTo;
    const loginUrl = `/login?next=${encodeURIComponent(safeReturnTo)}`;
    return NextResponse.json(
      {
        error: 'login_required',
        loginUrl,
      },
      { status: 401 },
    );
  }

  const stripe = getStripe();
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';

  const effectiveSource = source === 'billing' ? 'billing' : 'landing';
  if (userId && effectiveSource === 'landing') {
    const existing = await getLatestPledgeForUser(userId);
    const hasActivePledge =
      existing &&
      existing.status !== 'canceled' &&
      existing.status !== 'expired';
    if (hasActivePledge) {
      return NextResponse.json({
        alreadyPledged: true,
        redirectUrl: `${baseUrl}/billing?alreadyPledged=1&tab=billing`,
      });
    }
  }

  let stripeCustomerId: string | undefined;
  if (email) {
    const [dbUser] = await getUser(email);
    stripeCustomerId = dbUser?.stripeCustomerId ?? undefined;
  }

  const priceId = await getPriceId(plan, cycle);
  const metadata: Record<string, string> = {
    plan,
    cycle,
    source: 'umans-code-pledge',
    priceId,
  };
  if (userId) {
    metadata.userId = userId;
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    payment_method_collection: 'always',
    customer: stripeCustomerId || undefined,
    customer_email: stripeCustomerId ? undefined : email || undefined,
    success_url: `${baseUrl}/billing?pledge=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing?pledge=cancelled`,
    client_reference_id: userId || undefined,
    metadata,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      // Ensure trial_end is at least 2 days in the future (Stripe requirement)
      trial_end: Math.max(
        PLEDGE_CHARGE_START_TIMESTAMP,
        Math.floor(Date.now() / 1000) + MIN_TRIAL_SECONDS,
      ),
      metadata,
    },
    custom_text: {
      submit: {
        message: `Founding membership. No charge today. You'll be billed ${PLEDGE_CHARGE_START_LABEL}.`,
      },
      after_submit: {
        message: 'Start using Umans Code immediately.',
      },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
