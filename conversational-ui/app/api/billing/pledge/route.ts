import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { type BillingCycle, getStripe } from '@/lib/stripe';
import { getUser } from '@/lib/db/queries';

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

  const metadata: Record<string, string> = {
    plan,
    cycle,
    source: 'umans-code-pledge',
  };
  if (userId) {
    metadata.userId = userId;
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'setup',
    payment_method_types: ['card'],
    customer: stripeCustomerId || undefined,
    customer_email: stripeCustomerId ? undefined : email || undefined,
    success_url: `${baseUrl}/offers/code?pledge=success`,
    cancel_url: `${baseUrl}/offers/code?pledge=cancelled`,
    client_reference_id: userId || undefined,
    metadata,
    setup_intent_data: {
      metadata,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
