import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { type BillingCycle, getPriceId, getStripe } from '@/lib/stripe';
import { getUser } from '@/lib/db/queries';

type PledgePlanKey = 'code_pro' | 'code_max';
const DEADLINE_LABEL = 'February 28, 2026';
const CHARGE_START_TIMESTAMP = Math.floor(
  new Date('2026-03-01T00:00:00Z').getTime() / 1000,
);
const PRICE_LABELS: Record<PledgePlanKey, Record<BillingCycle, string>> = {
  code_pro: {
    monthly: '$20/month',
    yearly: '$200/year',
  },
  code_max: {
    monthly: '$50/month',
    yearly: '$500/year',
  },
};
const PLAN_LABELS: Record<PledgePlanKey, string> = {
  code_pro: 'Umans Code Pro',
  code_max: 'Umans Code Max',
};
const PLAN_DETAILS: Record<PledgePlanKey, string> = {
  code_pro: '200 prompts per 5 hours.',
  code_max: 'Unlimited prompts and 4 guaranteed parallel sessions.',
};

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

  const planLabel = PLAN_LABELS[plan];
  const priceLabel = PRICE_LABELS[plan][cycle];
  const planDetail = PLAN_DETAILS[plan];

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
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
      trial_end: CHARGE_START_TIMESTAMP,
      metadata,
    },
    custom_text: {
      submit: {
        message: `${planLabel} (${priceLabel}) · ${planDetail} You’ll only be charged if we launch by ${DEADLINE_LABEL}.`,
      },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
