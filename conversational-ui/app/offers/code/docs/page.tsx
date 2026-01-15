'use client';

import Link from 'next/link';
import { IconUmansLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';

const CodeBlock = ({ children }: { children: string }) => (
  <pre className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white/80 p-4 text-sm text-black/80 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:shadow-none">
    <code className="font-mono">{children}</code>
  </pre>
);

export default function CodeDocsPage() {
  return (
    <div className="relative min-h-screen bg-[#f6f6f4] text-[#0b0d10] font-sans antialiased dark:bg-[#0b0d10] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.12),transparent_60%)] blur-3xl opacity-70 dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(14,116,144,0.08),transparent_55%)] dark:hidden" />
        <div className="absolute -top-48 left-1/2 hidden h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(120,119,198,0.25),transparent_60%)] blur-3xl opacity-70 dark:block" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(60%_50%_at_80%_0%,rgba(94,234,212,0.12),transparent_55%)] dark:block" />
      </div>

      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/offers/code" className="flex items-center gap-2">
            <IconUmansLogo className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-tight">code docs</span>
          </Link>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/offers/code">Back to landing</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-16 px-6 py-16">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/40 dark:text-white/50">
            Quickstart
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Connect Claude Code to Umans.
          </h1>
          <p className="text-base text-black/70 dark:text-white/70">
            Install the Umans CLI, authenticate in the browser, and point Claude
            Code at the managed endpoint. The default model is{' '}
            <span className="font-semibold">umans-coder-v0</span>.
          </p>
          <CodeBlock>{`curl -fsSL https://umans.ai/install.sh | bash
umans auth   # opens browser, no copy/paste
umans claude # configures Claude Code`}</CodeBlock>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            1. Install Claude Code
          </h2>
          <p className="text-base text-black/70 dark:text-white/70">
            Claude Code is distributed by Anthropic. Follow their setup guide if
            you do not already have it installed.
          </p>
          <Link
            href="https://docs.claude.com/en/docs/claude-code/setup"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
          >
            Claude Code setup documentation →
          </Link>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            2. Authenticate with Umans
          </h2>
          <p className="text-base text-black/70 dark:text-white/70">
            Run the CLI once to open a browser sign-in flow. We’ll provision an
            API key in your dashboard automatically.
          </p>
          <CodeBlock>{`umans auth`}</CodeBlock>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            3. Configure Claude Code
          </h2>
          <p className="text-base text-black/70 dark:text-white/70">
            Edit <code>~/.claude/settings.json</code> and set the Umans endpoint
            and API key. If you already have Anthropic variables set, remove
            them so Claude Code uses the Umans values.
          </p>
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            Clear these if they are set: <code>ANTHROPIC_AUTH_TOKEN</code>,{' '}
            <code>ANTHROPIC_BASE_URL</code>.
          </div>
          <CodeBlock>{`{
  "env": {
    "ANTHROPIC_BASE_URL": "<UMANS_ENDPOINT>",
    "ANTHROPIC_AUTH_TOKEN": "<UMANS_API_KEY>",
    "ANTHROPIC_MODEL": "umans-coder-v0",
    "ANTHROPIC_SMALL_FAST_MODEL": "umans-coder-v0",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "umans-coder-v0",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "umans-coder-v0",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "umans-coder-v0"
  }
}`}</CodeBlock>
          <p className="text-xs text-black/50 dark:text-white/50">
            We’ll publish the exact endpoint and key format in the dashboard at
            launch.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            4. Start coding
          </h2>
          <p className="text-base text-black/70 dark:text-white/70">
            In your repo, run Claude Code and trust the folder when prompted.
          </p>
          <CodeBlock>{`claude`}</CodeBlock>
        </section>
      </main>
    </div>
  );
}
