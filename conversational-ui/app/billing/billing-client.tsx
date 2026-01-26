'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  PLEDGE_CHARGE_START_LABEL,
  PLEDGE_DEADLINE_LABEL,
  PLEDGE_PLAN_DETAILS,
  PLEDGE_PLAN_LABELS,
} from '@/lib/pledge';
import type { BillingCycle } from '@/lib/stripe';

type PledgePlanKey = 'code_pro' | 'code_max';

type PledgeSummary = {
  plan: PledgePlanKey;
  billingCycle: BillingCycle;
  status: string;
};

type BillingClientProps = {
  pledge: PledgeSummary | null;
  portalUrl: string;
};

const planOptions = {
  code_pro: {
    label: 'Pro',
    description: PLEDGE_PLAN_DETAILS.code_pro,
    bullets: [
      '200 Claude Code prompts per five-hour window.',
      'Limits reset every five hours (rolling window).',
    ],
    monthlyPrice: '$20',
    yearlyPrice: '$17',
  },
  code_max: {
    label: 'Max',
    description: PLEDGE_PLAN_DETAILS.code_max,
    bullets: [
      'Unlimited prompts.',
      '4 guaranteed parallel Claude Code sessions.',
      'Extra burst capacity when available.',
    ],
    monthlyPrice: '$50',
    yearlyPrice: '$42',
  },
} as const;

const billingLabel = (cycle: BillingCycle) =>
  cycle === 'yearly' ? 'billed yearly' : 'billed monthly';

const planPriceLine = (plan: PledgePlanKey, cycle: BillingCycle) => {
  const price = cycle === 'yearly'
    ? (plan === 'code_pro' ? '$200 per year' : '$500 per year')
    : (plan === 'code_pro' ? '$20 per month' : '$50 per month');
  return `${price}, ${billingLabel(cycle)}`;
};

export function BillingClient({ pledge, portalUrl }: BillingClientProps) {
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    pledge?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
  );
  const [loadingPlan, setLoadingPlan] = useState<PledgePlanKey | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'get-started' | 'api-keys' | 'billing'
  >('get-started');
  const [showAlreadyPledgedMessage, setShowAlreadyPledgedMessage] =
    useState(false);

  const isActive = Boolean(
    pledge && pledge.status !== 'canceled' && pledge.status !== 'expired',
  );

  const activePledge = isActive && pledge ? pledge : null;

  useEffect(() => {
    const outcome = searchParams?.get('pledge');
    if (outcome === 'success') {
      toast.success('Pledge saved. We’ll email you when access opens.');
    }
    if (outcome === 'cancelled') {
      toast.message('Pledge checkout canceled.');
    }
  }, [searchParams]);

  useEffect(() => {
    const pledgePlan = searchParams?.get('pledgePlan') as PledgePlanKey | null;
    const pledgeCycle = searchParams?.get('pledgeCycle') as BillingCycle | null;
    if (activePledge) {
      return;
    }
    if (!pledgePlan || !pledgeCycle) return;
    if (pledgePlan !== 'code_pro' && pledgePlan !== 'code_max') return;
    if (pledgeCycle !== 'monthly' && pledgeCycle !== 'yearly') return;
    setBillingCycle(pledgeCycle);
    startPledge(pledgePlan, pledgeCycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'api-keys' || tab === 'billing' || tab === 'get-started') {
      setActiveTab(tab);
    }
    const alreadyPledged = searchParams?.get('alreadyPledged');
    const changePlan = searchParams?.get('changePlan');
    if (alreadyPledged) {
      setShowAlreadyPledgedMessage(true);
      setActiveTab('billing');
    }
    if (changePlan) {
      setDialogOpen(true);
      setActiveTab('billing');
    }
  }, [searchParams]);

  const startPledge = async (
    plan: PledgePlanKey,
    cycle: BillingCycle = billingCycle,
  ) => {
    try {
      setLoadingPlan(plan);
      const res = await fetch('/api/billing/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          cycle,
          returnTo: `/billing?pledgePlan=${plan}&pledgeCycle=${cycle}`,
          source: 'billing',
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data?.loginUrl) {
        window.location.href = data.loginUrl as string;
        return;
      }
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      toast.error('Unable to start Stripe checkout. Try again.');
    } catch (err) {
      console.error(err);
      toast.error('Unable to start Stripe checkout. Try again.');
    } finally {
      setLoadingPlan(null);
      setDialogOpen(false);
    }
  };

  const cancelPledge = async () => {
    try {
      setCancelling(true);
      const res = await fetch('/api/billing/pledge/cancel', { method: 'POST' });
      if (!res.ok) {
        toast.error('Unable to cancel pledge. Please try again.');
        return;
      }
      toast.success('Pledge canceled.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Unable to cancel pledge. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-16">
      <aside className="w-full lg:pt-1">
        <nav data-billing-nav className="flex flex-col gap-1 text-[13px]">
          {[
            { id: 'get-started', label: 'Get Started' },
            { id: 'api-keys', label: 'API keys' },
            { id: 'billing', label: 'Billing' },
          ].map((item) => {
            const isActiveTab = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left font-medium transition focus-visible:outline-none',
                  isActiveTab
                    ? 'bg-white/5 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="w-full max-w-2xl space-y-8">
        {activeTab === 'get-started' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Get Started</h2>
            {activePledge ? (
              <div className="space-y-4 text-base leading-relaxed text-white/70">
                <p className="font-semibold text-white/90">
                  Welcome to Umans Code. Your Founding seat is reserved.
                </p>
                <p>
                  We are preparing your access now and will open accounts on
                  March 1, 2026.
                </p>
                <p>We will email you as soon as your endpoint is ready.</p>
              </div>
            ) : (
              <div className="space-y-4 text-base text-white/70">
                <p>Your pledge is no longer active.</p>
                <p>If you still want a Founding seat, choose a plan below.</p>
                <Button
                  variant="outline"
                  className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setActiveTab('billing');
                    setDialogOpen(true);
                  }}
                >
                  Choose a plan
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'api-keys' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">API keys</h2>
              <p className="mt-3 text-base leading-relaxed text-white/70">
                Keys will be available on March 1, 2026. We will email you when
                access opens.
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === 'billing' ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div>
                    {activePledge ? (
                      <>
                        <h2 className="text-2xl font-semibold text-white">
                          {PLEDGE_PLAN_LABELS[activePledge.plan]}
                          <span className="text-white/60">
                            {` · ${activePledge.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`}
                          </span>
                        </h2>
                        <p className="mt-2 text-sm text-white/60">
                          {planPriceLine(
                            activePledge.plan,
                            activePledge.billingCycle,
                          )}
                        </p>
                        <p className="mt-2 text-sm text-white/70">
                          {PLEDGE_PLAN_DETAILS[activePledge.plan]}
                        </p>
                        <p className="mt-4 text-sm text-white/60">
                          Billing starts {PLEDGE_CHARGE_START_LABEL}. If we do
                          not launch by {PLEDGE_DEADLINE_LABEL}, you will not be
                          charged.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold text-white">
                          No active pledge
                        </h2>
                        <p className="mt-2 text-sm text-white/60">
                          Choose a plan to reserve your Founding seat.
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white"
                      >
                        {isActive ? 'Change plan' : 'Choose a plan'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl border-white/10 bg-[#0b0d10] text-white">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl">
                          Choose your plan
                        </DialogTitle>
                      </DialogHeader>
                      {showAlreadyPledgedMessage ? (
                        <div className="mt-2 text-sm text-white/60">
                          You already have an active Founding pledge. If you
                          want to switch plans, choose one below.
                        </div>
                      ) : null}
                      <div className="mt-4 flex w-fit items-center rounded-full border border-white/10 bg-white/5 p-1 text-sm">
                        <button
                          type="button"
                          onClick={() => setBillingCycle('monthly')}
                          className={cn(
                            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                            billingCycle === 'monthly'
                              ? 'bg-white text-[#0b0d10] shadow-sm'
                              : 'text-white/60 hover:text-white',
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('yearly')}
                          className={cn(
                            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                            billingCycle === 'yearly'
                              ? 'bg-white text-[#0b0d10] shadow-sm'
                              : 'text-white/60 hover:text-white',
                          )}
                        >
                          Yearly
                        </button>
                      </div>
                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {(Object.keys(planOptions) as PledgePlanKey[]).map(
                          (plan) => {
                            const option = planOptions[plan];
                            const price =
                              billingCycle === 'yearly'
                                ? option.yearlyPrice
                                : option.monthlyPrice;
                            const isPlanActive = isActive && pledge?.plan === plan;
                            return (
                              <div
                                key={plan}
                                className={cn(
                                  'flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6',
                                  isPlanActive
                                    ? 'border-white/40 bg-white/10'
                                    : 'hover:border-white/30',
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {option.label}
                                    </h3>
                                    {isPlanActive ? (
                                      <span className="mt-2 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/70">
                                        Active
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-end gap-2 text-right">
                                    <span className="text-2xl font-semibold text-white">
                                      {price}
                                    </span>
                                    <div className="w-20 text-left text-xs leading-tight text-white/60">
                                      <div>per month</div>
                                      <div>{billingLabel(billingCycle)}</div>
                                    </div>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm font-medium text-white/70">
                                  {option.description}
                                </p>
                                <ul className="mt-4 space-y-2 text-sm text-white/60">
                                  {option.bullets.map((bullet) => (
                                    <li key={bullet}>{bullet}</li>
                                  ))}
                                </ul>
                                <div className="mt-auto pt-6">
                                  <Button
                                    className={cn(
                                      'w-full rounded-full',
                                      isPlanActive
                                        ? 'border border-white/20 bg-transparent text-white/70 hover:bg-white/5'
                                        : 'bg-white text-[#0b0d10] hover:bg-white/90',
                                    )}
                                    onClick={() => startPledge(plan, billingCycle)}
                                    disabled={loadingPlan === plan || isPlanActive}
                                  >
                                    {isPlanActive
                                      ? 'Active plan'
                                      : loadingPlan === plan
                                        ? 'Opening Stripe…'
                                        : 'Select plan'}
                                  </Button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {isActive ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white"
                          disabled={cancelling}
                        >
                          {cancelling ? 'Canceling…' : 'Cancel pledge'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-white/10 bg-[#0b0d10] text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel your pledge?</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/60">
                            Your founding seat will be released immediately. You
                            won&apos;t be billed unless you pledge again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
                            Keep pledge
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-full bg-white text-[#0b0d10] hover:bg-white/90"
                            onClick={cancelPledge}
                          >
                            Cancel pledge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Manage billing</h2>
                <p className="mt-2 text-sm text-white/60">
                  Update your payment method or review invoices in Stripe.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={portalUrl} target="_blank" rel="noreferrer">
                  Manage billing
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
