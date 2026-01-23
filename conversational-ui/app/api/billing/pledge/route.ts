import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { type BillingCycle, getPriceId, getStripe } from '@/lib/stripe';
import { getUser } from '@/lib/db/queries';
import {
  PLEDGE_CHARGE_START_TIMESTAMP,
  PLEDGE_CHARGE_START_LABEL,
  PLEDGE_DEADLINE_LABEL,
} from '@/lib/pledge';

type PledgePlanKey = 'code_pro' | 'code_max';

export async function POST(req: Request) {
  const { plan, cycle }: { plan: PledgePlanKey; cycle: BillingCycle } =
    await req.json();

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
    const returnTo = `/offers/code?pledgePlan=${plan}&pledgeCycle=${cycle}#plans`;
    const loginUrl = `/login?next=${encodeURIComponent(returnTo)}`;
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
    success_url: `${baseUrl}/offers/code?pledge=success`,
    cancel_url: `${baseUrl}/offers/code?pledge=cancelled`,
    client_reference_id: userId || undefined,
    metadata,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_end: PLEDGE_CHARGE_START_TIMESTAMP,
      metadata,
    },
    custom_text: {
      submit: {
        message:
          `Founding pledge — no charge today. You’ll be billed ${PLEDGE_CHARGE_START_LABEL} only if we launch by ${PLEDGE_DEADLINE_LABEL}.`,
      },
      after_submit: {
        message: 'Founding access rolls out progressively as capacity opens.',
      },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
