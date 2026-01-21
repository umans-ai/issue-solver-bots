import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'code by Umans | Claude Code without limits',
  description:
    'A managed Claude Code-compatible endpoint running the strongest open-source coding model, kept up to date for software tasks.',
  openGraph: {
    title: 'code by Umans | Claude Code without limits',
    description:
      'A managed Claude Code-compatible endpoint running the strongest open-source coding model, kept up to date for software tasks.',
    url: 'https://code.umans.ai',
    siteName: 'Umans AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'code by Umans | Claude Code without limits',
    description:
      'A managed Claude Code-compatible endpoint running the strongest open-source coding model, kept up to date for software tasks.',
    creator: '@umans_ai',
  },
  alternates: {
    canonical: '/offers/code',
  },
  keywords: [
    'Claude Code',
    'coding agents',
    'managed endpoint',
    'open-source models',
    'DeepSeek v3.2',
    'agentic coding',
  ],
};

export default function CodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
