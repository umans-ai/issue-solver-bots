import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import {
  PLEDGE_DEADLINE_TIMESTAMP,
  PLEDGE_PLAN_LABELS,
  PLEDGE_PRICE_LABELS,
} from '@/lib/pledge';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pledge, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
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

      if (plan?.startsWith('code_')) {
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
        const subscriptionId =
          typeof s.subscription === 'string'
            ? s.subscription
            : s.subscription?.id;

        const email =
          s.customer_details?.email || s.customer_email || undefined;

        const priceId = s.metadata?.priceId as string | undefined;
        let subscriptionStatus: string | undefined;
        let paymentMethodId: string | undefined;

        if (mode === 'subscription') {
          if (!subscriptionId) {
            throw new Error('Missing subscription ID for pledge session');
          }
          const updatedSubscription = await stripe.subscriptions.update(
            subscriptionId,
            {
              cancel_at: PLEDGE_DEADLINE_TIMESTAMP,
              proration_behavior: 'none',
            },
          );
          subscriptionStatus = updatedSubscription.status;
          const defaultPaymentMethod = updatedSubscription.default_payment_method;
          paymentMethodId =
            typeof defaultPaymentMethod === 'string'
              ? defaultPaymentMethod
              : defaultPaymentMethod?.id;
        }

        let isNewPledge = false;
        if (plan && billingCycle) {
          const [existingPledge] = await db
            .select({ id: pledge.id })
            .from(pledge)
            .where(eq(pledge.checkoutSessionId, s.id))
            .limit(1);
          isNewPledge = !existingPledge;
          await db
            .insert(pledge)
            .values({
              userId: userId ?? null,
              email,
              plan,
              billingCycle,
              priceId: priceId ?? undefined,
              status: subscriptionStatus || (mode === 'subscription' ? 'trialing' : 'verified'),
              stripeCustomerId: stripeCustomerId ?? undefined,
              paymentMethodId,
              stripeSubscriptionId: subscriptionId ?? undefined,
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
                status: subscriptionStatus || (mode === 'subscription' ? 'trialing' : 'verified'),
                stripeCustomerId: stripeCustomerId ?? undefined,
                paymentMethodId,
                stripeSubscriptionId: subscriptionId ?? undefined,
                updatedAt: new Date(),
              },
            });

          if (isNewPledge && email) {
            try {
              const { sendPledgeConfirmationEmail } = await import('@/lib/email');
              const planLabel =
                PLEDGE_PLAN_LABELS[plan as keyof typeof PLEDGE_PLAN_LABELS] ||
                'Umans Code';
              const priceLabel =
                PLEDGE_PRICE_LABELS[plan as keyof typeof PLEDGE_PRICE_LABELS]?.[
                  billingCycle as 'monthly' | 'yearly'
                ] || '';
              const billingCycleLabel =
                billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
              await sendPledgeConfirmationEmail(email, {
                planLabel,
                billingCycleLabel,
                priceLabel,
              });
            } catch (emailError) {
              console.error('Failed to send pledge confirmation email:', emailError);
            }
          }
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
      const plan = sub.metadata?.plan as string | undefined;
      if (plan?.startsWith('code_')) {
        await db
          .update(pledge)
          .set({ status: sub.status as string, updatedAt: new Date() })
          .where(eq(pledge.stripeSubscriptionId, sub.id));
        break;
      }
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
      const plan = sub.metadata?.plan as string | undefined;
      if (plan?.startsWith('code_')) {
        await db
          .update(pledge)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(pledge.stripeSubscriptionId, sub.id));
        break;
      }
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
