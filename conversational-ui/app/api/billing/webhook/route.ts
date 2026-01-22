import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pledge, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const CHARGE_START_TIMESTAMP = Math.floor(
  new Date('2026-03-01T00:00:00Z').getTime() / 1000,
);

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  const body = await req.text();

  let event;
  const stripe = getStripe();
  try {
    event = stripe.webhooks.constructEvent(body, sig as string, webhookSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // db client (avoid importing queries to keep low-level update)
  // biome-ignore lint: Forbidden non-null assertion
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as any;
      const mode = s.mode as string | undefined;
      const plan = s.metadata?.plan as string | undefined;

      if (mode === 'setup' || plan?.startsWith('code_')) {
        const rawUserId: string | undefined =
          s.client_reference_id || s.metadata?.userId;
        const userId =
          typeof rawUserId === 'string' && rawUserId.trim()
            ? rawUserId
            : undefined;
        const billingCycle = s.metadata?.cycle as string | undefined;
        const stripeCustomerId: string | undefined = s.customer as
          | string
          | undefined;
        const setupIntentId =
          typeof s.setup_intent === 'string'
            ? s.setup_intent
            : s.setup_intent?.id;

        let paymentMethodId: string | undefined;
        if (setupIntentId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
          paymentMethodId =
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id;
        }

        const email =
          s.customer_details?.email || s.customer_email || undefined;

        let scheduleId: string | undefined;
        const priceId = s.metadata?.priceId as string | undefined;
        if (stripeCustomerId && paymentMethodId && priceId && billingCycle) {
          try {
            const schedule = await stripe.subscriptionSchedules.create({
              customer: stripeCustomerId,
              start_date: CHARGE_START_TIMESTAMP,
              end_behavior: 'release',
              default_settings: {
                default_payment_method: paymentMethodId,
              },
              phases: [
                {
                  items: [{ price: priceId, quantity: 1 }],
                  duration: {
                    interval: billingCycle === 'yearly' ? 'year' : 'month',
                    interval_count: 1,
                  },
                  billing_cycle_anchor: 'phase_start',
                  metadata: {
                    plan: plan ?? '',
                    cycle: billingCycle,
                    priceId,
                    source: 'umans-code-pledge',
                  },
                },
              ],
              metadata: {
                plan: plan ?? '',
                cycle: billingCycle,
                priceId,
                source: 'umans-code-pledge',
              },
            });
            scheduleId = schedule.id;
          } catch (err) {
            console.error('Failed to create subscription schedule', err);
          }
        }

        if (plan && billingCycle) {
          await db
            .insert(pledge)
            .values({
              userId: userId ?? null,
              email,
              plan,
              billingCycle,
              priceId: priceId ?? undefined,
              status: scheduleId ? 'scheduled' : 'verified',
              stripeCustomerId: stripeCustomerId ?? undefined,
              paymentMethodId,
              setupIntentId,
              stripeScheduleId: scheduleId,
              checkoutSessionId: s.id,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: pledge.checkoutSessionId,
              set: {
                userId: userId ?? null,
                email,
                plan,
                billingCycle,
                priceId: priceId ?? undefined,
                status: scheduleId ? 'scheduled' : 'verified',
                stripeCustomerId: stripeCustomerId ?? undefined,
                paymentMethodId,
                setupIntentId,
                stripeScheduleId: scheduleId,
                updatedAt: new Date(),
              },
            });
        }
        break;
      }

      const userId: string | undefined =
        s.client_reference_id || s.metadata?.userId;
      const stripeCustomerId: string | undefined = s.customer as
        | string
        | undefined;
      if (userId) {
        await db
          .update(user)
          .set({
            stripeCustomerId: stripeCustomerId ?? undefined,
            plan: (plan as any) || 'free',
            subscriptionStatus: 'active',
          })
          .where(eq(user.id, userId));
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as any;
      const stripeCustomerId = sub.customer as string;
      const status = sub.status as string;
      // We need to locate user by customer id
      await db
        .update(user)
        .set({ subscriptionStatus: status })
        .where(eq(user.stripeCustomerId, stripeCustomerId));
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const stripeCustomerId = sub.customer as string;
      await db
        .update(user)
        .set({ plan: 'free', subscriptionStatus: 'canceled' })
        .where(eq(user.stripeCustomerId, stripeCustomerId));
      break;
    }
    default:
      // ignore
      break;
  }

  return NextResponse.json({ received: true });
}
