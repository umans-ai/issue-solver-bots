'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { IconUmansLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

const FOUNDING_TARGET = 250;
const DEADLINE_LABEL = 'February 28, 2026';

const pledgeCountRaw = Number(process.env.NEXT_PUBLIC_FOUNDING_PLEDGES);
const pledgeCount = Number.isFinite(pledgeCountRaw) ? pledgeCountRaw : 0;
const pledgePercent = Math.min(
  Math.round((pledgeCount / FOUNDING_TARGET) * 100),
  100,
);

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';
const secondaryButtonClasses =
  'rounded-full border border-black/15 text-[#0b0d10] hover:border-black/30 hover:text-[#0b0d10] transition-colors dark:border-white/20 dark:text-white dark:hover:border-white/40';
const ghostLinkClasses =
  'text-sm font-medium text-black/60 hover:text-black transition-colors dark:text-white/60 dark:hover:text-white';

const plans = {
  monthly: {
    max: {
      price: '$20',
      cadence: '/mo',
      subline: 'Claude Code-style rolling window and weekly usage envelope.',
      billing: 'Billed monthly.',
    },
    unlimited: {
      price: '$50',
      cadence: '/mo',
      subline: 'Unlimited tokens with concurrency limits.',
      billing: 'Billed monthly.',
    },
  },
  yearly: {
    max: {
      price: '$17',
      cadence: '/mo',
      subline: 'Claude Code-style rolling window and weekly usage envelope.',
      billing: 'Billed $200 yearly.',
    },
    unlimited: {
      price: '$42',
      cadence: '/mo',
      subline: 'Unlimited tokens with concurrency limits.',
      billing: 'Billed $500 yearly.',
    },
  },
};

type BillingCycle = keyof typeof plans;

const benchmarkRows = [
  {
    label: 'SWE-bench Multilingual',
    description: 'Multi-language',
    values: {
      deepseek: 70.2,
      sonnet: 68.0,
      opus: 77.5,
    },
  },
  {
    label: 'Terminal Bench 2.0',
    description: 'End-to-end',
    values: {
      deepseek: 46.4,
      sonnet: 42.8,
      opus: 57.8,
    },
  },
  {
    label: 'SWE-bench Verified',
    description: 'Python-only',
    values: {
      deepseek: 73.1,
      sonnet: 77.2,
      opus: 80.9,
    },
  },
];

const benchmarkModels = [
  {
    key: 'deepseek',
    label: 'umans-coder-v0',
    bar: 'bg-[linear-gradient(90deg,rgba(250,117,170,0.95),rgba(192,132,252,0.55))] dark:bg-[linear-gradient(90deg,rgba(250,117,170,0.9),rgba(216,180,254,0.6))]',
  },
  {
    key: 'sonnet',
    label: 'Claude Sonnet 4.5',
    bar: 'bg-[linear-gradient(90deg,rgba(251,146,60,0.9),rgba(253,186,116,0.55))] dark:bg-[linear-gradient(90deg,rgba(251,146,60,0.95),rgba(253,186,116,0.6))]',
  },
  {
    key: 'opus',
    label: 'Claude Opus 4.5',
    bar: 'bg-[linear-gradient(90deg,rgba(249,115,22,0.95),rgba(251,146,60,0.55))] dark:bg-[linear-gradient(90deg,rgba(249,115,22,0.95),rgba(251,146,60,0.6))]',
  },
];

export default function CodeLandingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const demosRef = useRef<HTMLDivElement>(null);
  const currentPlans = plans[billingCycle];

  const scrollDemos = (direction: 'prev' | 'next') => {
    const el = demosRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-demo-card]');
    const gapValue =
      Number.parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || '0') ||
      24;
    const scrollAmount = (card?.getBoundingClientRect().width ?? el.clientWidth) + gapValue;
    el.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative min-h-screen bg-[#f6f6f4] text-[#0b0d10] font-sans antialiased dark:bg-[#0b0d10] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.12),transparent_60%)] blur-3xl opacity-70 dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(14,116,144,0.08),transparent_55%)] dark:hidden" />
        <div className="absolute -top-48 left-1/2 hidden h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(120,119,198,0.25),transparent_60%)] blur-3xl opacity-70 dark:block" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(60%_50%_at_80%_0%,rgba(94,234,212,0.12),transparent_55%)] dark:block" />
      </div>

      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
          >
            <IconUmansLogo className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-tight">code</span>
          </Link>
          <nav className="landing-nav hidden items-center gap-6 text-sm font-medium text-black/60 md:flex dark:text-white/70">
            <Link href="#plans" className="hover:text-black dark:hover:text-white">
              Plans
            </Link>
            <Link
              href="https://blog.umans.ai/blog/host-claude-code/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black dark:hover:text-white"
            >
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-black/50 md:flex dark:text-white/60">
              <a
                href="https://discord.gg/Q5hdNrk7Rw"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="Discord"
              >
                <FaDiscord className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/umans_ai"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="X"
              >
                <FaXTwitter className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/umans-ai"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn className="h-4 w-4" />
              </a>
            </div>
            <ThemeToggle variant="ghost" />
            <Button asChild size="sm" className={primaryButtonClasses}>
              <Link href="#pledge">Pledge</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section>
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24 md:py-32">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                Drop-in for Claude Code
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight text-balance md:text-6xl">
                <span className="bg-gradient-to-r from-[#0b0d10] via-[#4b5563] to-[#0b0d10] bg-clip-text text-transparent dark:from-[#f8fafc] dark:via-[#b6c2cf] dark:to-[#f8fafc]">
                  Claude Code, without the limits.
                </span>
              </h1>
              <p className="mt-6 text-base text-black/70 md:text-lg leading-relaxed dark:text-white/70">
                Keep the Claude Code workflow. Swap the limits for a managed
                endpoint we run for software work.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className={primaryButtonClasses}>
                  <Link href="#pledge">Pledge a Founding seat</Link>
                </Button>
                <Link
                  href="https://blog.umans.ai/blog/host-claude-code/"
                  target="_blank"
                  rel="noreferrer"
                  className={ghostLinkClasses}
                >
                  See how we built it
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="direction"
          className="relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-black/20 before:to-transparent dark:before:via-white/20"
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                Model + workflow
              </p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Built around the Claude Code workflow.
              </h2>
              <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                We develop the model stack and the workflow around it so the
                endpoint feels complete and improves as better models arrive.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.75))] p-7 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_50px_rgba(15,23,42,0.08)] backdrop-blur transition-shadow dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] dark:shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/50">
                  Model stack
                </p>
                <p className="mt-4 text-lg font-semibold">
                  Built and operated by us.
                </p>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                  We develop the stack and run the serving layer end to end.
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.75))] p-7 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_50px_rgba(15,23,42,0.08)] backdrop-blur transition-shadow dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] dark:shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/50">
                  Workflow coverage
                </p>
                <p className="mt-4 text-lg font-semibold">We fill the gaps.</p>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                  When Claude Code needs something extra, we add it. Vision
                  runs via MCP today with native vision in progress.
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.75))] p-7 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_50px_rgba(15,23,42,0.08)] backdrop-blur transition-shadow dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] dark:shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40 dark:text-white/50">
                  Improvement track
                </p>
                <p className="mt-4 text-lg font-semibold">
                  Capability work in progress.
                </p>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                  We invest in closing gaps without trading off coding quality.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <div className="max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                  Experience parity
                </p>
                <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                  Benchmarks are a proxy for the same agentic experience you
                  expect in Claude Code.
                </p>
                <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                  What you actually get is the Claude Code loop you already
                  trust, tools, context, and long sessions, served by a stack
                  we run and tune for reliability. We update the model when
                  something clearly better appears.
                </p>
              </div>
              <div className="mt-6 rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.25)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <p className="mb-4 text-base font-semibold tracking-tight text-black/80 dark:text-white/80">
                  Agentic coding benchmarks
                </p>
                <div className="space-y-7">
                  {benchmarkRows.map((row) => (
                    <div key={row.label}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                        <span>{row.label}</span>
                        <span className="text-xs text-black/45 dark:text-white/45">
                          {row.description}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {benchmarkModels.map((model) => {
                          const value =
                            row.values[model.key as keyof typeof row.values];
                          return (
                            <div
                              key={model.key}
                              className="flex items-center gap-3"
                            >
                              <span className="w-36 text-xs font-medium text-black/60 dark:text-white/60">
                                {model.label}
                              </span>
                              <div className="relative h-2.5 flex-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                                <div
                                  className={cn(
                                    'h-2.5 rounded-full',
                                    model.bar,
                                  )}
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                              <span className="w-12 text-xs font-semibold text-black/70 dark:text-white/70">
                                {value}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                    Demos
                  </p>
                  <p className="text-base text-black/70 dark:text-white/70">
                    Claude Code sessions on the Umans endpoint.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollDemos('prev')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/60 transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Previous demo"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollDemos('next')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/60 transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Next demo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="relative">
                <div
                  ref={demosRef}
                  data-demos-carousel
                  className="flex gap-6 overflow-x-auto scroll-smooth pb-4 pr-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {[
                    {
                      id: 'yu7gTHoo16M',
                      title: 'Claude Code session with umans-coder-v0',
                    },
                    {
                      id: 'P6xWWBzraRo',
                      title: 'MCP web search + code context in Claude Code',
                    },
                  ].map((video) => (
                    <div
                      key={video.id}
                      data-demo-card
                      className="min-w-[260px] w-[82%] flex-none snap-center overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:w-[70%] md:w-[58%]"
                    >
                      <div className="aspect-video w-full bg-black/5 dark:bg-white/5">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube.com/embed/${video.id}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-sm font-medium">{video.title}</p>
                        <Link
                          href="https://blog.umans.ai/blog/host-claude-code/"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs text-black/50 underline-offset-4 hover:underline dark:text-white/50"
                        >
                          See full write-up →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#f6f6f4] to-transparent dark:from-[#0b0d10]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#f6f6f4] to-transparent dark:from-[#0b0d10]" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="founding"
          className="relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-black/20 before:to-transparent dark:before:via-white/20"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                Founding 250
              </p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                We launch when 250 seats are pledged.
              </h2>
              <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                Serving open-source models at usable latency has a baseline
                cost. Founding 250 is the minimum to start with a stable,
                reliable setup.
              </p>
              <p className="text-sm text-black/60 dark:text-white/60">
                Pledge now, charge only if we launch by {DEADLINE_LABEL}.
              </p>
            </div>
            <div className="w-full rounded-3xl border border-black/10 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
              <div className="text-4xl font-semibold">{pledgeCount}</div>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                pledged seats out of {FOUNDING_TARGET}
              </p>
              <div className="mt-6 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-black dark:bg-white"
                  style={{ width: `${pledgePercent}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                <span>{pledgePercent}% to launch</span>
                <span>Deadline: {DEADLINE_LABEL}</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="plans"
          className="relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-black/20 before:to-transparent dark:before:via-white/20"
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                  Plans
                </p>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Choose your usage envelope.
                </h2>
                <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                  Limits are enforced at the account level. Enterprise does not
                  count toward Founding 250.
                </p>
              </div>
              <div className="flex w-fit items-center rounded-full border border-black/10 bg-black/5 p-1 text-sm dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    billingCycle === 'monthly'
                      ? 'bg-[#0b0d10] text-white shadow-sm dark:bg-white dark:text-[#0b0d10]'
                      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white',
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
                      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white',
                  )}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="flex h-full flex-col rounded-3xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <div className="text-sm text-black/60 dark:text-white/60">
                    <span className="text-base font-semibold text-black dark:text-white">
                      {currentPlans.max.price}
                    </span>
                    {currentPlans.max.cadence}
                  </div>
                </div>
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                  {currentPlans.max.subline}
                </p>
                <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                  {currentPlans.max.billing}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-black/70 dark:text-white/70">
                  <li>Predictable capacity similar to Anthropic Max 5x.</li>
                  <li>Designed for long sessions without token math.</li>
                  <li>Account-level limits, not per device.</li>
                </ul>
                <div className="mt-auto pt-6">
                  <Button asChild className={primaryButtonClasses + ' w-full'}>
                    <Link href="#pledge">Pledge this plan</Link>
                  </Button>
                </div>
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-black/15 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-white/20 dark:bg-white/10 dark:shadow-none">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">Max</h3>
                  <div className="text-sm text-black/60 dark:text-white/60">
                    <span className="text-base font-semibold text-black dark:text-white">
                      {currentPlans.unlimited.price}
                    </span>
                    {currentPlans.unlimited.cadence}
                  </div>
                </div>
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                  {currentPlans.unlimited.subline}
                </p>
                <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                  {currentPlans.unlimited.billing}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-black/70 dark:text-white/70">
                  <li>4 guaranteed parallel Claude Code sessions.</li>
                  <li>Extra burst capacity when available.</li>
                  <li>Guardrails to keep latency stable for everyone.</li>
                </ul>
                <div className="mt-auto pt-6">
                  <Button asChild className={primaryButtonClasses + ' w-full'}>
                    <Link href="#pledge">Pledge this plan</Link>
                  </Button>
                </div>
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">Enterprise</h3>
                </div>
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                  Self-hosted in your infrastructure with a managed update
                  track.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-black/70 dark:text-white/70">
                  <li>Deploy the serving stack inside your environment.</li>
                  <li>Model upgrade windows and pinned versions.</li>
                  <li>Custom integration with your toolchain.</li>
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    href="mailto:contact@umans.ai"
                    className={
                      secondaryButtonClasses +
                      ' inline-flex w-full items-center justify-center px-4 py-2 text-sm'
                    }
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pledge"
          className="relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-black/20 before:to-transparent dark:before:via-white/20"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
                Pledge
              </p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Reserve a Founding seat.
              </h2>
              <p className="text-base text-black/70 leading-relaxed dark:text-white/70">
                You will enter payment details now, but you are only charged if
                we reach 250 seats and launch by {DEADLINE_LABEL}. If we do not
                reach the threshold by then, you will not be charged.
              </p>
            </div>
            <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">Pledge opens soon</p>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Stripe checkout will be connected here. For now, choose a plan
                to reserve a seat.
              </p>
              <Button asChild className={primaryButtonClasses + ' mt-6 w-full'}>
                <Link href="#plans">Choose a plan</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-black/50 md:flex-row md:items-center md:justify-between dark:text-white/60">
            <p>Umans · code. Built for serious agentic work.</p>
            <div className="flex gap-4">
              <Link
                href="https://blog.umans.ai"
                target="_blank"
                rel="noreferrer"
                className="hover:text-black dark:hover:text-white"
              >
                Blog
              </Link>
              <Link
                href="mailto:contact@umans.ai"
                className="hover:text-black dark:hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
