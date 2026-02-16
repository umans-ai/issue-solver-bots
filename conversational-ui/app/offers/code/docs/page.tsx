'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { IconUmansLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Copy, Check, Menu, X, ChevronRight, Mail, LayoutDashboard } from 'lucide-react';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';

const sections = [
  { id: 'quick-start', title: 'Quick Start' },
  { id: 'cli-commands', title: 'CLI Commands' },
  { id: 'manual-config', title: 'Manual Configuration' },
  { id: 'tool-setup', title: 'Tool-Specific Setup' },
  { id: 'api-reference', title: 'API Reference' },
  { id: 'models', title: 'Models' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
  { id: 'faq', title: 'FAQ' },
  { id: 'support', title: 'Support' },
];

const tools = [
  { id: 'claude-code', title: 'Claude Code' },
  { id: 'opencode', title: 'OpenCode' },
  { id: 'cursor', title: 'Cursor IDE' },
  { id: 'crush', title: 'Crush' },
  { id: 'openai-compatible', title: 'OpenAI-Compatible Tools' },
];

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-black/10 bg-[#1a1918] dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs text-white/60">{language}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm text-[#b9b6ad]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm font-medium text-[#0b0d10] dark:bg-white/10 dark:text-white">
      {children}
    </code>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-black/5 dark:bg-white/5">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-semibold text-[#0b0d10] dark:text-white"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-[#5e5d59] dark:text-white/70"
                >
                  {j === 0 ? (
                    <span className="font-medium text-[#0b0d10] dark:text-white">
                      {cell}
                    </span>
                  ) : (
                    <code className="text-xs">{cell}</code>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Benchmark data from API and research
type BenchmarkKey = 'omnidocbench' | 'mmmu_pro' | 'swe_bench' | 'mathvision';

interface BenchmarkData {
  name: string;
  description: string;
  maxScore: number;
  date: string;
  models: { name: string; score: number; color: string }[];
}

const benchmarkData: Record<BenchmarkKey, BenchmarkData> = {
  omnidocbench: {
    name: 'OmniDocBench',
    description: 'Document understanding and OCR benchmark. Higher is better.',
    maxScore: 95,
    date: 'January 2026',
    models: [
      { name: 'Kimi K2.5 (umans-coder)', score: 88.8, color: '#d97757' },
      { name: 'Gemini 3 Pro', score: 88.5, color: '#4285f4' },
      { name: 'Claude Opus 4.5', score: 87.7, color: '#cc785c' },
      { name: 'GPT-5.2', score: 85.7, color: '#10a37f' },
      { name: 'Claude 3.5 Sonnet', score: 62.5, color: '#a85d48' },
    ],
  },
  mmmu_pro: {
    name: 'MMMU Pro',
    description: 'Multimodal understanding across college-level disciplines.',
    maxScore: 85,
    date: 'January 2026',
    models: [
      { name: 'Gemini 3 Pro', score: 81.0, color: '#4285f4' },
      { name: 'Kimi K2.5 (umans-coder)', score: 78.5, color: '#d97757' },
      { name: 'GPT-5.2', score: 79.5, color: '#10a37f' },
      { name: 'Claude Opus 4.5', score: 74.0, color: '#cc785c' },
      { name: 'Claude Sonnet 4.5', score: 68.0, color: '#a85d48' },
    ],
  },
  swe_bench: {
    name: 'SWE-Bench Verified',
    description: 'Real-world software engineering task resolution.',
    maxScore: 85,
    date: 'February 2026',
    models: [
      { name: 'Claude Opus 4.5', score: 80.9, color: '#cc785c' },
      { name: 'Claude Opus 4.6', score: 80.8, color: '#b86b52' },
      { name: 'MiniMax M2.5 (umans-minimax-m2.5)', score: 80.2, color: '#d97757' },
      { name: 'Claude Sonnet 4.5', score: 77.2, color: '#a85d48' },
      { name: 'Kimi K2.5 (umans-coder)', score: 76.8, color: '#e88a6a' },
    ],
  },
  mathvision: {
    name: 'MathVision',
    description: 'Mathematical reasoning with visual understanding.',
    maxScore: 90,
    date: 'January 2026',
    models: [
      { name: 'Kimi K2.5 (umans-coder)', score: 84.2, color: '#d97757' },
      { name: 'Gemini 3 Pro', score: 86.1, color: '#4285f4' },
      { name: 'Claude Opus 4.5', score: 82.0, color: '#cc785c' },
      { name: 'GPT-5.2', score: 81.5, color: '#10a37f' },
    ],
  },
};

function BenchmarkChart() {
  const [activeBenchmark, setActiveBenchmark] = useState<BenchmarkKey>('omnidocbench');
  const data = benchmarkData[activeBenchmark];

  return (
    <div className="my-6">
      {/* Benchmark selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(benchmarkData) as BenchmarkKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveBenchmark(key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeBenchmark === key
                ? 'bg-[#d97757] text-white'
                : 'bg-black/5 text-[#5e5d59] hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20'
            )}
          >
            {benchmarkData[key].name}
          </button>
        ))}
      </div>

      {/* Description with date */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#5e5d59] dark:text-white/60">{data.description}</p>
        <span className="text-xs text-[#5e5d59]/60 dark:text-white/40">{data.date}</span>
      </div>

      {/* Chart */}
      <div className="space-y-3">
        {data.models.map((model) => {
          const isUmansModel = model.name.includes('umans-') || model.name.includes('(umans-');
          return (
            <div key={model.name} className="flex items-center gap-3">
              <div className={cn(
                "w-48 shrink-0 text-xs sm:w-56 sm:text-sm",
                isUmansModel
                  ? "font-semibold text-[#0b0d10] dark:text-white"
                  : "text-[#5e5d59] dark:text-white/70"
              )}>
                {model.name}
              </div>
            <div className="flex-1">
              <div className="h-6 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className="flex h-full items-center justify-end pr-2 text-xs font-medium text-white transition-all duration-500"
                  style={{
                    width: `${(model.score / data.maxScore) * 100}%`,
                    backgroundColor: model.color,
                  }}
                >
                  <span className="drop-shadow-sm">{model.score}%</span>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('quick-start');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0b0d10]">
      {/* Header - matching landing page */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/offers/code"
            className="flex items-center gap-2 text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
          >
            <IconUmansLogo className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-tight">code</span>
          </Link>

          <nav className="landing-nav hidden items-center gap-6 text-sm font-medium text-black/60 md:flex dark:text-white/70">
            <Link href="/offers/code#plans" className="hover:text-black dark:hover:text-white">
              Plans
            </Link>
            <Link
              href="/offers/code/docs"
              className="text-black dark:text-white"
            >
              Docs
            </Link>
            <Link
              href="https://blog.umans.ai/blog"
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
            <Link
              href="/login?next=/billing"
              className={cn(
                'hidden px-4 py-2 text-sm font-medium md:inline-flex',
                primaryButtonClasses
              )}
            >
              Login
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 transition-colors hover:bg-black/5 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 transform bg-[#f6f6f4] px-6 pt-24 transition-transform dark:bg-[#0b0d10] sm:static sm:translate-x-0 sm:bg-transparent sm:pt-0',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="docs-sidebar-nav space-y-6">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
                Getting Started
              </h3>
              <ul className="space-y-1">
                {sections.slice(0, 4).map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm transition-colors',
                        activeSection === section.id
                          ? 'font-medium text-[#0b0d10] dark:text-white'
                          : 'text-[#5e5d59] hover:text-[#0b0d10] dark:text-white/60 dark:hover:text-white'
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
                Tool Setup
              </h3>
              <ul className="space-y-1">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <button
                      onClick={() => scrollToSection(tool.id)}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm transition-colors',
                        activeSection === tool.id
                          ? 'font-medium text-[#0b0d10] dark:text-white'
                          : 'text-[#5e5d59] hover:text-[#0b0d10] dark:text-white/60 dark:hover:text-white'
                      )}
                    >
                      {tool.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
                Reference
              </h3>
              <ul className="space-y-1">
                {sections.slice(4).map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm transition-colors',
                        activeSection === section.id
                          ? 'font-medium text-[#0b0d10] dark:text-white'
                          : 'text-[#5e5d59] hover:text-[#0b0d10] dark:text-white/60 dark:hover:text-white'
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden dark:bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-3xl">
            {/* Hero */}
            <div className="mb-12 border-b border-black/10 pb-12 dark:border-white/10">
              <h1 className="text-4xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Umans Code User Guide
              </h1>
              <p className="mt-4 text-xl text-[#5e5d59] dark:text-white/70">
                <strong className="text-[#0b0d10] dark:text-white">
                  Keep your agent working. All day.
                </strong>
              </p>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                Umans Code delivers a Claude Code-first agentic development experience with
                ultra-generous usage limits, powered by the best open-source models available.
                We currently serve{' '}
                <strong className="text-[#0b0d10] dark:text-white">Kimi K2.5</strong> and{' '}
                <strong className="text-[#0b0d10] dark:text-white">MiniMax M2.5</strong>.
                We publish our model tests and reviews at{' '}
                <a
                  href="https://blog.umans.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#d97757] underline-offset-2 hover:underline"
                >
                  blog.umans.ai
                </a>
                .
              </p>
            </div>

            {/* Quick Start */}
            <section id="quick-start" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Quick Start (Recommended)
              </h2>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                The fastest way to get started is with the Umans CLI. It handles authentication and
                launches Claude Code with zero configuration.
              </p>

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                macOS & Linux
              </h3>
              <CodeBlock code={`# Install the CLI (one-time)
curl -fsSL https://api.code.umans.ai/cli/install.sh | bash

# Launch Claude Code with Umans backend
umans claude`} />

              <div className="mt-6 rounded-xl border border-[#d97757]/20 bg-[#d97757]/5 p-4 dark:border-[#d97757]/30 dark:bg-[#d97757]/10">
                <p className="text-sm text-[#5e5d59] dark:text-white/70">
                  <strong className="text-[#0b0d10] dark:text-white">Video Demo:</strong>{' '}
                  <a
                    href="https://youtu.be/Ihqt9ZH8c8M"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    CLI with Claude Code walkthrough
                  </a>
                </p>
              </div>

              <p className="mt-6 text-[#5e5d59] dark:text-white/70">
                <strong className="text-[#0b0d10] dark:text-white">First run:</strong> The CLI opens
                your browser for authentication. Log in to your Umans account, and the CLI
                automatically receives your API key. Claude Code launches immediately with the Umans
                backend configured.
              </p>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                <strong className="text-[#0b0d10] dark:text-white">Subsequent runs:</strong>{' '}
                <InlineCode>umans claude</InlineCode> launches instantly using your saved
                credentials.
              </p>
            </section>

            {/* CLI Commands */}
            <section id="cli-commands" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                CLI Commands
              </h2>
              <CodeBlock code={`umans claude                          # Launch Claude Code (default: umans-coder)
umans claude --model umans-minimax-m2.5   # Use MiniMax M2.5 with vision/websearch handoffs
umans opencode                       # Launch OpenCode with Umans backend
umans status                         # Check authentication status
umans logout                         # Remove saved credentials
umans --help                         # Show all available commands`} />
            </section>

            {/* Manual Configuration */}
            <section id="manual-config" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Manual Configuration (Alternative)
              </h2>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                If the CLI does not work for your setup (Windows users, custom environments) or you
                prefer to configure tools manually, use these settings:
              </p>

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                API Endpoint
              </h3>
              <Table
                headers={['Setting', 'Value']}
                rows={[
                  ['Base URL', 'https://api.code.umans.ai'],
                  ['Anthropic Endpoint', 'https://api.code.umans.ai/v1/messages'],
                  ['OpenAI Endpoint', 'https://api.code.umans.ai/v1/chat/completions'],
                  ['Model Name', 'umans-coder'],
                ]}
              />

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                Getting Your API Key
              </h3>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-[#5e5d59] dark:text-white/70">
                <li>
                  Log in to{' '}
                  <a
                    href="https://app.umans.ai/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    app.umans.ai/billing
                  </a>
                </li>
                <li>Go to your Dashboard &rarr; API Keys</li>
                <li>Generate a new key (shown only once - copy it immediately)</li>
              </ol>
            </section>

            {/* Tool-Specific Setup */}
            <section id="tool-setup" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Tool-Specific Setup
              </h2>

              {/* Claude Code */}
              <div id="claude-code" className="mt-8 scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  Claude Code{' '}
                  <a
                    href="https://docs.anthropic.com/en/docs/claude-code/overview"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-normal text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Official Docs →
                  </a>
                </h3>
                <p className="mt-2 text-sm font-medium text-[#0b0d10] dark:text-white">
                  Using the CLI (Recommended):
                </p>
                <CodeBlock code={`umans claude                    # Default: umans-coder (Kimi K2.5)
umans claude --model umans-minimax-m2.5   # MiniMax M2.5 with vision/websearch`} />

                <h4 className="mt-6 text-sm font-semibold text-[#0b0d10] dark:text-white">
                  Available Models:
                </h4>
                <Table
                  headers={['Model', 'Provider', 'Capabilities', 'Best For']}
                  rows={[
                    ['umans-coder', 'Kimi K2.5', 'Text, Vision, WebSearch', 'General coding (default)'],
                    ['umans-kimi-k2.5', 'Kimi K2.5', 'Text, Vision, WebSearch', 'Native Kimi experience'],
                    ['umans-minimax-m2.5', 'MiniMax M2.5', 'Text, Vision (handoff), WebSearch (handoff)', 'Fast text + smart handoffs'],
                  ]}
                />

                <p className="mt-4 text-sm font-medium text-[#0b0d10] dark:text-white">
                  Manual configuration:
                </p>
                <CodeBlock
                  code={`export ANTHROPIC_BASE_URL=https://api.code.umans.ai
export ANTHROPIC_AUTH_TOKEN=sk-your-umans-api-key
claude --model umans-coder`}
                />
              </div>

              {/* OpenCode */}
              <div id="opencode" className="mt-8 scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  OpenCode{' '}
                  <a
                    href="https://opencode.ai/docs"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-normal text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Official Docs →
                  </a>
                </h3>
                <p className="mt-2 text-sm font-medium text-[#0b0d10] dark:text-white">
                  Using the CLI (Recommended):
                </p>
                <CodeBlock code={`umans opencode                          # Default: umans-coder
umans opencode --model umans-kimi-k2.5  # Use native Kimi K2.5`} />
                <p className="mt-4 text-sm font-medium text-[#0b0d10] dark:text-white">
                  Manual configuration (add to <InlineCode>~/.opencode/config.json</InlineCode>):
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "umans": {
      "npm": "@ai-sdk/anthropic",
      "name": "Umans coder",
      "options": {
        "baseURL": "https://api.code.umans.ai/v1",
        "apiKey": "sk-your-umans-api-key"
      },
      "models": {
        "umans-coder": {
          "name": "Umans coder"
        }
      }
    }
  }
}`}
                />
              </div>

              {/* Cursor */}
              <div id="cursor" className="mt-8 scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  Cursor IDE{' '}
                  <a
                    href="https://docs.cursor.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-normal text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Official Docs →
                  </a>
                </h3>
                <div className="mt-4 rounded-xl border border-[#d97757]/20 bg-[#d97757]/5 p-4 dark:border-[#d97757]/30 dark:bg-[#d97757]/10">
                  <p className="text-sm text-[#5e5d59] dark:text-white/70">
                    <strong className="text-[#0b0d10] dark:text-white">Video Demo:</strong>{' '}
                    <a
                      href="https://youtu.be/cgNSltLn_Ao?si=cVPs3oP5u1sg1vQq"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d97757] underline-offset-2 hover:underline"
                    >
                      Setting up Cursor with Umans Code
                    </a>
                  </p>
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-[#5e5d59] dark:text-white/70">
                  <li>Open Cursor Settings &rarr; Models</li>
                  <li>Enable <strong className="text-[#0b0d10] dark:text-white">Override OpenAI Base URL</strong></li>
                  <li>
                    Set the base URL to: <InlineCode>https://api.code.umans.ai/v1</InlineCode>
                  </li>
                  <li>Paste your Umans API key in the API key field</li>
                  <li>
                    Add the custom model: <InlineCode>umans-coder</InlineCode>
                  </li>
                  <li>Select <InlineCode>umans-coder</InlineCode> in the model dropdown</li>
                </ol>
              </div>

              {/* Crush */}
              <div id="crush" className="mt-8 scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  Crush (Charm Bracelet){' '}
                  <a
                    href="https://charm.land/crush"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-normal text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Official Docs →
                  </a>
                </h3>
                <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                  Add to your Crush configuration ({' '}
                  <InlineCode>~/.config/crush/config.json</InlineCode> ):
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "$schema": "https://charm.land/crush.json",
  "providers": {
    "umans": {
      "type": "anthropic",
      "base_url": "https://api.code.umans.ai",
      "api_key": "sk-your-umans-api-key",
      "models": [
        {
          "id": "umans-coder",
          "name": "Umans Coder",
          "default_max_tokens": 50000,
          "can_reason": true
        }
      ]
    }
  }
}`}
                />
              </div>

              {/* OpenAI Compatible */}
              <div id="openai-compatible" className="mt-8 scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  Any OpenAI-Compatible Tool
                </h3>
                <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                  Umans Code exposes an OpenAI-compatible API. Configure any tool that supports
                  custom OpenAI endpoints:
                </p>
                <ul className="mt-4 space-y-2 text-[#5e5d59] dark:text-white/70">
                  <li>
                    <strong className="text-[#0b0d10] dark:text-white">Base URL:</strong>{' '}
                    <InlineCode>https://api.code.umans.ai/v1</InlineCode>
                  </li>
                  <li>
                    <strong className="text-[#0b0d10] dark:text-white">API Key:</strong> Your Umans
                    API key (starts with <InlineCode>sk-</InlineCode>)
                  </li>
                  <li>
                    <strong className="text-[#0b0d10] dark:text-white">Model:</strong>{' '}
                    <InlineCode>umans-coder</InlineCode>
                  </li>
                </ul>
              </div>
            </section>

            {/* API Reference */}
            <section id="api-reference" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                API Reference
              </h2>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  Anthropic-Compatible Endpoints
                </h3>
                <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                  Umans Code implements the{' '}
                  <a
                    href="https://docs.anthropic.com/en/api/messages"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Anthropic Messages API
                  </a>
                  .
                </p>
                <p className="mt-4 font-mono text-sm font-medium text-[#0b0d10] dark:text-white">
                  POST /v1/messages
                </p>
                <CodeBlock
                  code={`curl -N -X POST https://api.code.umans.ai/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk-your-umans-api-key" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "umans-coder",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 4096,
    "stream": true
  }'`}
                />
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">
                  OpenAI-Compatible Endpoints
                </h3>
                <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                  Umans Code also implements the{' '}
                  <a
                    href="https://platform.openai.com/docs/api-reference/chat"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    OpenAI Chat Completions API
                  </a>
                  .
                </p>
                <p className="mt-4 font-mono text-sm font-medium text-[#0b0d10] dark:text-white">
                  POST /v1/chat/completions
                </p>
                <CodeBlock
                  code={`curl -N -X POST https://api.code.umans.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-umans-api-key" \\
  -d '{
    "model": "umans-coder",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`}
                />
              </div>
            </section>

            {/* Models */}
            <section id="models" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Models
              </h2>

              <div className="mt-6 rounded-xl border border-[#d97757]/20 bg-[#d97757]/5 p-4 dark:border-[#d97757]/30 dark:bg-[#d97757]/10">
                <p className="text-[#5e5d59] dark:text-white/70">
                  <strong className="text-[#0b0d10] dark:text-white">Our Philosophy:</strong> We
                  believe in serving the best open-source models available. We continuously
                  evaluate and filter models to ensure your agents stay productive all day—without
                  the decision fatigue of choosing between dozens of options.
                </p>
              </div>

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                Available Models
              </h3>
              <Table
                headers={['Model', 'Provider', 'Best For', 'Trade-off']}
                rows={[
                  ['umans-coder', 'Kimi K2.5', 'General coding (default)', 'Zero overhead, native multimodal'],
                  ['umans-kimi-k2.5', 'Kimi K2.5', 'Vision-heavy workflows', 'Same as above, explicit alias'],
                  ['umans-minimax-m2.5', 'MiniMax M2.5', 'Fast text + occasional vision/websearch', 'Smart handoffs add ~100-200ms overhead for image/search'],
                ]}
              />

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                How to Choose
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5e5d59] dark:text-white/70">
                <li>
                  Use <InlineCode>umans-coder</InlineCode> (default) for most work—it&apos;s our
                  recommended balanced option
                </li>
                <li>
                  Use <InlineCode>umans-minimax-m2.5</InlineCode> when you primarily do text
                  coding but occasionally need vision/websearch
                </li>
                <li>
                  Use <InlineCode>umans-kimi-k2.5</InlineCode> when you explicitly want the
                  native Kimi experience
                </li>
              </ul>

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                Benchmark Comparison
              </h3>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                We believe in transparency. Select a benchmark below to see how our served
                models compare across different capabilities. Our models excel particularly in
                document understanding and multimodal tasks.
              </p>

              <BenchmarkChart />

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/5 p-4 dark:border-[#d97757]/30 dark:bg-[#d97757]/10">
                  <p className="text-sm text-[#5e5d59] dark:text-white/70">
                    <strong className="text-[#0b0d10] dark:text-white">🏆 State of the Art:</strong>{' '}
                    On{' '}
                    <a
                      href="https://github.com/opendatalab/OmniDocBench"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d97757] underline-offset-2 hover:underline"
                    >
                      OmniDocBench
                    </a>
                    , Kimi K2.5 achieves <strong>88.8%</strong> — outperforming Gemini 3 Pro
                    (88.5%), Claude Opus 4.5 (87.7%), and GPT-5.2 (85.7%) on document
                    understanding and OCR tasks.
                  </p>
                </div>
                <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/5 p-4 dark:border-[#d97757]/30 dark:bg-[#d97757]/10">
                  <p className="text-sm text-[#5e5d59] dark:text-white/70">
                    <strong className="text-[#0b0d10] dark:text-white">🚀 Best in Class Coding:</strong>{' '}
                    MiniMax M2.5 achieves <strong>80.2%</strong> on{' '}
                    <a
                      href="https://www.swebench.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d97757] underline-offset-2 hover:underline"
                    >
                      SWE-Bench Verified
                    </a>
                    — competitive with Claude Opus 4.5 (80.9%) and ahead of Claude Sonnet 4.5
                    (77.2%). Use <InlineCode>umans-minimax-m2.5</InlineCode> for demanding
                    software engineering tasks.
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-[#5e5d59] dark:text-white/60">
                <p>
                  Sources:{' '}
                  <a
                    href="https://github.com/MoonshotAI/Kimi-K2.5"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Moonshot AI
                  </a>
                  ,{' '}
                  <a
                    href="https://www.anthropic.com/news/claude-opus-4-6"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Anthropic
                  </a>
                  ,{' '}
                  <a
                    href="https://www.vellum.ai/blog/claude-opus-4-6-benchmarks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Vellum AI
                  </a>
                  ,{' '}
                  <a
                    href="http://export.arxiv.org/pdf/2502.13923"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d97757] underline-offset-2 hover:underline"
                  >
                    Qwen2.5-VL Technical Report
                  </a>
                </p>
                <p className="mt-2">
                  <strong>Note:</strong> Scores are from official model reports and independent
                  evaluations. Different benchmarks test different capabilities—choose the one
                  that matches your use case. Data available via{' '}
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10">/v1/models/info</code>.
                </p>
              </div>

              <h3 className="mt-8 text-lg font-semibold text-[#0b0d10] dark:text-white">
                Model Information API
              </h3>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                For programmatic access to current model information, including context windows,
                pricing, and capabilities:
              </p>
              <CodeBlock
                code={`curl https://api.code.umans.ai/v1/models/info | jq`}
              />
              <p className="mt-2 text-sm text-[#5e5d59] dark:text-white/60">
                This public endpoint returns up-to-date information about all available models,
                their capabilities, and current pricing.
              </p>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Troubleshooting
              </h2>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">CLI Issues</h3>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        &quot;Command not found: umans&quot;
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>
                          Ensure <InlineCode>~/.local/bin</InlineCode> or{' '}
                          <InlineCode>/usr/local/bin</InlineCode> is in your PATH
                        </li>
                        <li>
                          Run <InlineCode>source ~/.bashrc</InlineCode> or{' '}
                          <InlineCode>source ~/.zshrc</InlineCode> after installation
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        &quot;Authentication failed&quot;
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>
                          Run <InlineCode>umans logout</InlineCode> to clear saved credentials
                        </li>
                        <li>
                          Run <InlineCode>umans claude</InlineCode> again to re-authenticate
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        Browser does not open
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>Copy the URL shown in the terminal and open it manually</li>
                        <li>
                          The CLI displays a localhost callback URL - authentication will complete
                          when you visit the URL
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    Connection Issues
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        &quot;401 Unauthorized&quot;
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>Your API key may be expired or revoked</li>
                        <li>
                          Generate a new key in the{' '}
                          <a
                            href="https://app.umans.ai/billing"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#d97757] underline-offset-2 hover:underline"
                          >
                            Dashboard
                          </a>
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        &quot;Rate limit exceeded&quot;
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>You have hit your plan&apos;s usage limits</li>
                        <li>
                          Check your usage in the{' '}
                          <a
                            href="https://app.umans.ai/billing"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#d97757] underline-offset-2 hover:underline"
                          >
                            Dashboard
                          </a>{' '}
                          or upgrade your plan
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                      <p className="font-medium text-[#0b0d10] dark:text-white">
                        Streaming interruptions
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#5e5d59] dark:text-white/70">
                        <li>
                          For long-running sessions, some networks may drop idle connections
                        </li>
                        <li>Check your network stability or try a wired connection</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">Windows-Specific</h3>
                  <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                    The Umans CLI is not yet available for Windows. Use the manual configuration
                    method with your preferred tool:
                  </p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-[#5e5d59] dark:text-white/70">
                    <li>
                      Set environment variables in PowerShell:
                      <CodeBlock
                        language="powershell"
                        code={`$env:ANTHROPIC_BASE_URL="https://api.code.umans.ai"
$env:ANTHROPIC_AUTH_TOKEN="sk-your-umans-api-key"`}
                      />
                    </li>
                    <li>
                      Or configure directly in your tool&apos;s settings using the manual
                      configuration values above
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                FAQ
              </h2>

              <div className="mt-6 space-y-6">
                <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    What models does Umans Code use?
                  </h3>
                  <p className="mt-2 text-[#5e5d59] dark:text-white/70">
                    Umans Code serves the best open-source models available. We currently offer:
                  </p>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5e5d59] dark:text-white/70">
                    <li>
                      <strong className="text-[#0b0d10] dark:text-white">umans-coder</strong> —
                      Kimi K2.5 for general coding (default, zero overhead, native multimodal)
                    </li>
                    <li>
                      <strong className="text-[#0b0d10] dark:text-white">umans-kimi-k2.5</strong> —
                      Native Kimi K2.5 for vision-heavy workflows
                    </li>
                    <li>
                      <strong className="text-[#0b0d10] dark:text-white">umans-minimax-m2.5</strong>{' '}
                      — MiniMax M2.5 for fast text coding with smart vision/websearch handoffs
                    </li>
                  </ul>
                  <p className="mt-4 text-[#5e5d59] dark:text-white/70">
                    We publish our model evaluations and reviews at{' '}
                    <a
                      href="https://blog.umans.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d97757] underline-offset-2 hover:underline"
                    >
                      blog.umans.ai
                    </a>
                    .
                  </p>
                </div>

                <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    Can I use my own Claude Code license?
                  </h3>
                  <p className="mt-2 text-[#5e5d59] dark:text-white/70">
                    Yes. If you have a Claude Code subscription with Anthropic, you can use{' '}
                    <InlineCode>claude</InlineCode> to run Claude Code with your Anthropic
                    subscription. Use <InlineCode>umans claude</InlineCode> when you want to use
                    Claude Code powered by Umans (best open-source model with unlimited tokens).
                    Switch between them anytime.
                  </p>
                </div>

                <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    Is my data secure?
                  </h3>
                  <p className="mt-2 text-[#5e5d59] dark:text-white/70">
                    Your code and conversations are processed through our infrastructure. We do not
                    train on your data. Enterprise customers can opt for self-hosted deployments
                    where all data remains within their infrastructure.
                  </p>
                </div>

                <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    What happens if I hit my usage limit?
                  </h3>
                  <p className="mt-2 text-[#5e5d59] dark:text-white/70">
                    The API will return a rate limit error. You can monitor your usage in the
                    Dashboard and upgrade your plan if needed. Limits reset according to your
                    billing cycle.
                  </p>
                </div>

                <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
                  <h3 className="font-semibold text-[#0b0d10] dark:text-white">
                    Can I use the same API key for multiple machines?
                  </h3>
                  <p className="mt-2 text-[#5e5d59] dark:text-white/70">
                    Yes, but be aware that usage counts against your plan&apos;s limits across all
                    usage. For team or multi-machine setups, consider the $50 plan with higher
                    limits and parallel sessions.
                  </p>
                </div>
              </div>
            </section>

            {/* Support */}
            <section id="support" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
                Support
              </h2>
              <p className="mt-4 text-[#5e5d59] dark:text-white/70">Need help?</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <a
                  href="https://discord.gg/Q5hdNrk7Rw"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/50 p-4 transition-colors hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  <FaDiscord className="h-6 w-6 text-[#5865F2]" />
                  <div>
                    <p className="font-medium text-[#0b0d10] dark:text-white">Discord</p>
                    <p className="text-sm text-[#5e5d59] dark:text-white/60">Join our community</p>
                  </div>
                </a>
                <a
                  href="mailto:contact@umans.ai"
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/50 p-4 transition-colors hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  <Mail className="h-6 w-6 text-[#0b0d10] dark:text-white" />
                  <div>
                    <p className="font-medium text-[#0b0d10] dark:text-white">Email</p>
                    <p className="text-sm text-[#5e5d59] dark:text-white/60">contact@umans.ai</p>
                  </div>
                </a>
                <a
                  href="https://app.umans.ai/billing"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/50 p-4 transition-colors hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  <LayoutDashboard className="h-6 w-6 text-[#d97757]" />
                  <div>
                    <p className="font-medium text-[#0b0d10] dark:text-white">Dashboard</p>
                    <p className="text-sm text-[#5e5d59] dark:text-white/60">
                      Manage your account
                    </p>
                  </div>
                </a>
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-16 border-t border-black/10 pt-8 dark:border-white/10">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-black/40 dark:text-white/40">
                  Umans · code. Built for serious agentic work.
                </p>
                <div className="flex items-center gap-6">
                  <Link
                    href="https://blog.umans.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  >
                    Blog
                  </Link>
                  <Link
                    href="mailto:contact@umans.ai"
                    className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
