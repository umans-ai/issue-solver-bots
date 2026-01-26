import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getStripe } from '@/lib/stripe';
import { getLatestPledgeForUser } from '@/lib/db/queries';
import { pledge } from '@/lib/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pledgeRecord = await getLatestPledgeForUser(session.user.id);
  if (!pledgeRecord?.stripeSubscriptionId) {
    return NextResponse.json(
      { error: 'No active pledge subscription' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  await stripe.subscriptions.cancel(pledgeRecord.stripeSubscriptionId);

  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);
  await db
    .update(pledge)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(eq(pledge.id, pledgeRecord.id));

  return NextResponse.json({ ok: true });
}
