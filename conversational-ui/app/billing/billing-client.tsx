'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Check, Copy } from 'lucide-react';
import useSWR from 'swr';

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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn, fetcher, pillOutlineButton } from '@/lib/utils';
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

type ApiKeySummary = {
  gatewayKeyId: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
};

type ApiKeysResponse = {
  keys: Array<ApiKeySummary>;
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
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    pledge?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
  );
  const [loadingPlan, setLoadingPlan] = useState<PledgePlanKey | null>(null);
  const [billingActionError, setBillingActionError] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    'get-started' | 'api-keys' | 'billing'
  >('get-started');

  const isActive = Boolean(
    pledge && pledge.status !== 'canceled' && pledge.status !== 'expired',
  );

  const activePledge = isActive && pledge ? pledge : null;

  const {
    data: apiKeysData,
    error: apiKeysError,
    isLoading: apiKeysLoading,
    mutate: mutateApiKeys,
  } = useSWR<ApiKeysResponse>(
    activeTab === 'api-keys' ? '/api/keys' : null,
    fetcher,
  );

  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<{
    key: string;
    keyPrefix: string;
  } | null>(null);
  const [newApiKeyOpen, setNewApiKeyOpen] = useState(false);
  const [newApiKeyCopied, setNewApiKeyCopied] = useState(false);
  const [newApiKeyCopyError, setNewApiKeyCopyError] = useState<string | null>(
    null,
  );
  const [apiKeysActionError, setApiKeysActionError] = useState<string | null>(
    null,
  );
  const [copiedCommand, setCopiedCommand] = useState<'install' | 'launch' | null>(null);

  const handleCopyCommand = async (command: 'install' | 'launch', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  useEffect(() => {
    const outcome = searchParams?.get('pledge');
    if (outcome !== 'success' && outcome !== 'cancelled') return;
    // Clean the URL so refreshing doesn't retrigger pledge state.
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('pledge');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? '/'), { scroll: false });
  }, [pathname, router, searchParams]);

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
    if (alreadyPledged) {
      setActiveTab('billing');
      // Clean the URL so refreshing doesn't retrigger this state change.
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('alreadyPledged');
      params.set('tab', 'billing');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : (pathname ?? '/'), { scroll: false });
    }
  }, [pathname, router, searchParams]);

  // Listen for open-pricing-dialog event from CodeUserNav
  useEffect(() => {
    const handleOpenPricing = () => {
      setActiveTab('billing');
      setDialogOpen(true);
    };
    window.addEventListener('open-pricing-dialog', handleOpenPricing);
    return () => window.removeEventListener('open-pricing-dialog', handleOpenPricing);
  }, []);

  const startPledge = async (
    plan: PledgePlanKey,
    cycle: BillingCycle = billingCycle,
  ) => {
    try {
      setLoadingPlan(plan);
      setBillingActionError(null);
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
      setBillingActionError('Unable to start Stripe checkout. Try again.');
    } catch (err) {
      console.error(err);
      setBillingActionError('Unable to start Stripe checkout. Try again.');
    } finally {
      setLoadingPlan(null);
    }
  };
  const copyNewApiKey = async () => {
    if (!newApiKey?.key) return;

    try {
      setNewApiKeyCopyError(null);
      await navigator.clipboard.writeText(newApiKey.key);
      setNewApiKeyCopied(true);
      window.setTimeout(() => setNewApiKeyCopied(false), 1500);
    } catch (err) {
      console.error(err);
      setNewApiKeyCopyError('Unable to copy. Please copy manually.');
    }
  };

  const createApiKey = async () => {
    try {
      setApiKeysActionError(null);
      setCreatingApiKey(true);
      const res = await fetch('/api/keys', { method: 'POST' });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === 'subscription_required') {
          setActiveTab('billing');
          setDialogOpen(true);
          return;
        }

        setApiKeysActionError('Unable to create API key. Try again.');
        return;
      }

      if (!data?.key || !data?.key_prefix) {
        setApiKeysActionError('Unable to create API key. Try again.');
        return;
      }

      setNewApiKey({
        key: data.key as string,
        keyPrefix: data.key_prefix as string,
      });
      setNewApiKeyCopied(false);
      setNewApiKeyCopyError(null);
      setNewApiKeyOpen(true);
      void mutateApiKeys();
    } catch (err) {
      console.error(err);
      setApiKeysActionError('Unable to create API key. Try again.');
    } finally {
      setCreatingApiKey(false);
    }
  };

  const revokeApiKey = async (gatewayKeyId: string) => {
    try {
      setApiKeysActionError(null);
      setRevokingKeyId(gatewayKeyId);
      const res = await fetch(`/api/keys/${gatewayKeyId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setApiKeysActionError('Unable to revoke key. Try again.');
        return;
      }

      void mutateApiKeys();
    } catch (err) {
      console.error(err);
      setApiKeysActionError('Unable to revoke key. Try again.');
    } finally {
      setRevokingKeyId(null);
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
                onClick={() => {
                  setActiveTab(item.id as typeof activeTab);
                  const params = new URLSearchParams(
                    searchParams?.toString() ?? '',
                  );
                  params.set('tab', item.id);
                  params.delete('pledge');
                  params.delete('alreadyPledged');
                  const qs = params.toString();
                  router.replace(qs ? `${pathname}?${qs}` : (pathname ?? '/'), {
                    scroll: false,
                  });
                }}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left font-medium transition focus-visible:outline-none',
                  isActiveTab
                    ? 'bg-black/5 dark:bg-white/5 text-[#0b0d10] dark:text-white'
                    : 'text-[#0b0d10]/55 dark:text-white/55 hover:bg-black/5 dark:bg-white/5 hover:text-[#0b0d10] dark:hover:text-white',
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
            <h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">Get Started</h2>
            {activePledge ? (
              <div className="space-y-6">
                {/* Install Command */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#0b0d10]/70 dark:text-white/70">
                    1. Install the CLI
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#0b0d10] p-1 pl-4 dark:border-white/10">
                    <code className="flex-1 truncate font-mono text-sm text-white/90">
                      <span className="text-[#d27a5a]">curl</span>
                      <span className="text-[#7dd3fc]"> -fsSL</span>
                      <span className="text-[#a5b4fc]"> https://api.code.umans.ai/cli/install.sh</span>
                      <span className="text-white/60"> | bash</span>
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand('install', 'curl -fsSL https://api.code.umans.ai/cli/install.sh | bash')}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
                    >
                      {copiedCommand === 'install' ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Launch Command */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#0b0d10]/70 dark:text-white/70">
                    2. Launch Claude Code with Umans backend
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#0b0d10] p-1 pl-4 dark:border-white/10">
                    <code className="flex-1 truncate font-mono text-sm text-white/90">
                      <span className="text-[#a5b4fc]">umans</span>
                      <span className="text-white/60"> claude</span>
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand('launch', 'umans claude')}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
                    >
                      {copiedCommand === 'launch' ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-base leading-relaxed text-[#0b0d10]/70 dark:text-white/70 pt-2">
                  <p className="font-semibold text-[#0b0d10]/90 dark:text-white/90">
                    Your Founding seat is reserved.
                  </p>
                  <p>
                    We are preparing your access now and will open accounts on
                    March 1, 2026.
                  </p>
                  <p>We will email you as soon as your endpoint is ready.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-base text-[#0b0d10]/70 dark:text-white/70">
                <p>Your pledge is no longer active.</p>
                <p>If you still want a Founding seat, choose a plan below.</p>
                <Button
                  className={pillOutlineButton}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">API keys</h2>
                <p className="mt-3 text-base leading-relaxed text-[#0b0d10]/70 dark:text-white/70">
                  Create keys to authenticate requests to the Umans Code API.
                  Your key is shown once - store it somewhere safe.
                </p>
              </div>

              <Button
                className={pillOutlineButton}
                onClick={createApiKey}
                disabled={!activePledge || creatingApiKey}
              >
                {creatingApiKey ? 'Creating...' : 'Create key'}
              </Button>
            </div>

            {apiKeysActionError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                {apiKeysActionError}
              </div>
            ) : null}

            {!activePledge ? (
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5 text-[#0b0d10]/70 dark:text-white/70">
                <p className="text-sm">You need an active pledge to create keys.</p>
                <Button
                  className={cn('mt-4', pillOutlineButton)}
                  onClick={() => {
                    setActiveTab('billing');
                    setDialogOpen(true);
                  }}
                >
                  Choose a plan
                </Button>
              </div>
            ) : null}

            <Dialog
              open={newApiKeyOpen}
              onOpenChange={(open) => {
                setNewApiKeyOpen(open);
                if (!open) {
                  setNewApiKey(null);
                  setNewApiKeyCopied(false);
                  setNewApiKeyCopyError(null);
                }
              }}
            >
              {newApiKey ? (
                <DialogContent className="max-w-2xl border-black/10 dark:border-black/10 bg-white dark:border-white/10 dark:bg-[#0b0d10] text-[#0b0d10] dark:text-white">
                  <DialogHeader className="space-y-2">
                    <DialogTitle className="text-2xl">
                      Your new API key
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-[#0b0d10]/60 dark:text-white/60">
                    This key is shown once. Copy it now and store it securely.
                  </p>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4">
                    <code className="w-full overflow-x-auto text-sm text-[#0b0d10]/90 dark:text-white/90">
                      {newApiKey.key}
                    </code>
                    <Button
                      size="icon"
                      className={pillOutlineButton}
                      onClick={copyNewApiKey}
                      aria-label="Copy API key"
                    >
                      {newApiKeyCopied ? <Check /> : <Copy />}
                    </Button>
                  </div>
                  {newApiKeyCopyError ? (
                    <p className="mt-2 text-xs text-red-700 dark:text-red-200">
                      {newApiKeyCopyError}
                    </p>
                  ) : null}
                </DialogContent>
              ) : null}
            </Dialog>

            {apiKeysError ? (
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5 text-[#0b0d10]/70 dark:text-white/70">
                <p className="text-sm">Failed to load keys.</p>
              </div>
            ) : apiKeysLoading ? (
              <p className="text-sm text-[#0b0d10]/60 dark:text-white/60">Loading...</p>
            ) : (
              <div className="space-y-3">
                {(apiKeysData?.keys ?? []).length ? (
                  (apiKeysData?.keys ?? []).map((key) => (
                    <div
                      key={key.gatewayKeyId}
                      className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-[#0b0d10] dark:text-white">
                            {key.keyPrefix}...
                          </div>
                          <div className="text-xs text-[#0b0d10]/50 dark:text-white/50">
                            Created {new Date(key.createdAt).toLocaleString()}
                          </div>
                          {key.revokedAt ? (
                            <div className="text-xs text-[#0b0d10]/50 dark:text-white/50">
                              Revoked{' '}
                              {new Date(key.revokedAt).toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-xs text-[#0b0d10]/50 dark:text-white/50">Active</div>
                          )}
                        </div>

                        {!key.revokedAt ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                className={pillOutlineButton}
                                disabled={revokingKeyId === key.gatewayKeyId}
                              >
                                {revokingKeyId === key.gatewayKeyId
                                  ? 'Revoking...'
                                  : 'Revoke'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-black/10 dark:border-black/10 bg-white dark:border-white/10 dark:bg-[#0b0d10] text-[#0b0d10] dark:text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API key</AlertDialogTitle>
                                <AlertDialogDescription className="text-[#0b0d10]/60 dark:text-white/60">
                                  Are you sure you&apos;d like to revoke{' '}
                                  <span className="font-medium text-[#0b0d10]/90 dark:text-white/90">
                                    {key.keyPrefix}...
                                  </span>
                                  ? This is permanent and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-4">
                                <AlertDialogCancel className={pillOutlineButton}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeApiKey(key.gatewayKeyId)}
                                  disabled={revokingKeyId === key.gatewayKeyId}
                                  className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {revokingKeyId === key.gatewayKeyId
                                    ? 'Revoking...'
                                    : 'Revoke'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#0b0d10]/60 dark:text-white/60">No keys yet.</p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'billing' ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div>
                    {activePledge ? (
                      <>
                        <h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">
                          {PLEDGE_PLAN_LABELS[activePledge.plan]}
                          <span className="text-[#0b0d10]/60 dark:text-white/60">
                            {` · ${activePledge.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`}
                          </span>
                        </h2>
                        <p className="mt-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
                          {planPriceLine(
                            activePledge.plan,
                            activePledge.billingCycle,
                          )}
                        </p>
                        <p className="mt-2 text-sm text-[#0b0d10]/70 dark:text-white/70">
                          {PLEDGE_PLAN_DETAILS[activePledge.plan]}
                        </p>
                        <p className="mt-4 text-sm text-[#0b0d10]/60 dark:text-white/60">
                          Billing starts {PLEDGE_CHARGE_START_LABEL}. If we do
                          not launch by {PLEDGE_DEADLINE_LABEL}, you will not be
                          charged.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">
                          No active pledge
                        </h2>
                        <p className="mt-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
                          Choose a plan to reserve your Founding seat.
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {!isActive ? (
                    <Dialog
                      open={dialogOpen}
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setBillingActionError(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className={pillOutlineButton}
                        >
                          Choose a plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl border-black/10 dark:border-black/10 bg-white dark:border-white/10 dark:bg-[#0b0d10] text-[#0b0d10] dark:text-white">
                        <DialogHeader className="space-y-2">
                          <DialogTitle className="text-2xl">
                            Choose your plan
                          </DialogTitle>
                        </DialogHeader>
                        {billingActionError ? (
                          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                            {billingActionError}
                          </div>
                        ) : null}
                        <div className="mt-4 flex w-fit items-center rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-1 text-sm">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                              billingCycle === 'monthly'
                                ? 'bg-[#0b0d10] text-white shadow-sm dark:bg-white dark:text-[#0b0d10]'
                                : 'text-[#0b0d10]/60 dark:text-white/60 hover:text-[#0b0d10] dark:hover:text-white',
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
                                ? 'bg-[#0b0d10] text-white shadow-sm dark:bg-white dark:text-[#0b0d10]'
                                : 'text-[#0b0d10]/60 dark:text-white/60 hover:text-[#0b0d10] dark:hover:text-white',
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
                              return (
                                <div
                                  key={plan}
                                  className="flex h-full flex-col rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6 hover:border-white/30"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h3 className="text-lg font-semibold">
                                        {option.label}
                                      </h3>
                                    </div>
                                    <div className="flex items-end gap-2 text-right">
                                      <span className="text-2xl font-semibold text-[#0b0d10] dark:text-white">
                                        {price}
                                      </span>
                                      <div className="w-20 text-left text-xs leading-tight text-[#0b0d10]/60 dark:text-white/60">
                                        <div>per month</div>
                                        <div>{billingLabel(billingCycle)}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="mt-3 text-sm font-medium text-[#0b0d10]/70 dark:text-white/70">
                                    {option.description}
                                  </p>
                                  <ul className="mt-4 space-y-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
                                    {option.bullets.map((bullet) => (
                                      <li key={bullet}>{bullet}</li>
                                    ))}
                                  </ul>
                                  <div className="mt-auto pt-6">
                                    <Button
                                      className="w-full rounded-full bg-[#0b0d10] text-white hover:bg-[#0b0d10]/90 dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90"
                                      onClick={() =>
                                        startPledge(plan, billingCycle)
                                      }
                                      disabled={loadingPlan === plan}
                                    >
                                      {loadingPlan === plan
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
                  ) : null}
                </div>
              </div>

            {billingActionError && !dialogOpen ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                {billingActionError}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 border-t border-black/10 dark:border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0b0d10] dark:text-white">Manage billing</h2>
                <p className="mt-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
                  Update your payment method or review invoices in Stripe.
                </p>
              </div>
              <Button
                asChild
                className={pillOutlineButton}
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
