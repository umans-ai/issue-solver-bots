import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { type BillingCycle, getPriceId, getStripe } from '@/lib/stripe';
import { getLatestPledgeForUser, getUser } from '@/lib/db/queries';

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
    payment_method_collection: 'if_required',
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
      metadata,
    },
    custom_text: {
      submit: {
        message:
          'Your founding member rate is locked in. Start using immediately.',
      },
      after_submit: {
        message: "You're all set! Start using Umans Code immediately.",
      },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
