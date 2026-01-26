import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { getLatestPledgeForUser } from '@/lib/db/queries';
import { PLEDGE_CHARGE_START_LABEL, PLEDGE_DEADLINE_LABEL, PLEDGE_PLAN_LABELS } from '@/lib/pledge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const sidebarItems = [
  { label: 'Dashboard', href: '/dashboard', active: true },
  { label: 'Pledge', href: '/offers/code#plans' },
  { label: 'Billing', href: '/dashboard#billing' },
  { label: 'API keys', href: '/dashboard#api-keys' },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/dashboard');
  }

  const pledgeRecord = await getLatestPledgeForUser(session.user.id);
  const hasActivePledge =
    pledgeRecord && pledgeRecord.status !== 'canceled' && pledgeRecord.status !== 'expired';

  const planLabel = pledgeRecord
    ? PLEDGE_PLAN_LABELS[pledgeRecord.plan as keyof typeof PLEDGE_PLAN_LABELS]
    : null;
  const cycleLabel =
    pledgeRecord?.billingCycle === 'yearly' ? 'Yearly' : pledgeRecord ? 'Monthly' : null;

  const portalUrl =
    process.env.STRIPE_BILLING_PORTAL_URL ||
    'https://dashboard.stripe.com/login?redirect=%2Finvoices';

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="text-sm font-semibold tracking-tight">Umans Code</div>
          <nav className="flex items-center gap-6 text-sm text-white/60">
            <Link className="text-white" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-white" href="/docs">
              Docs
            </Link>
            <Link className="hover:text-white" href="/docs">
              API reference
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="w-48 shrink-0 text-sm text-white/60">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2 transition-colors',
                  item.active
                    ? 'bg-white/10 text-white'
                    : 'hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </aside>

        <main className="flex-1">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            {hasActivePledge ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-white/50">
                    Founding pledge active
                  </p>
                  <h1 className="mt-4 text-2xl font-semibold">
                    {planLabel}
                    {cycleLabel ? (
                      <span className="text-white/60">{` · ${cycleLabel}`}</span>
                    ) : null}
                  </h1>
                </div>
                <p className="text-base text-white/70">
                  Billing starts {PLEDGE_CHARGE_START_LABEL} — only if we launch
                  by {PLEDGE_DEADLINE_LABEL}.
                </p>
                <div>
                  <Link
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-[#0b0d10] transition hover:bg-white/90"
                  >
                    Manage pledge
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-white/50">
                  No pledge yet
                </p>
                <h1 className="text-2xl font-semibold">
                  Reserve a Founding seat
                </h1>
                <p className="text-base text-white/70">
                  No charge unless we launch by {PLEDGE_DEADLINE_LABEL}.
                </p>
                <div>
                  <Link
                    href="/offers/code#plans"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-[#0b0d10] transition hover:bg-white/90"
                  >
                    Pledge a Founding seat
                  </Link>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
