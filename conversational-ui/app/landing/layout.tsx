import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Umans Code – Claude Code Without Limits | Drop-in LLM Endpoint',
  description:
    'Replace Claude Code limits with unlimited AI coding. Drop-in LLM endpoint for Claude Code, Cursor, OpenCode, and any OpenAI/Anthropic-compatible tool. Start coding without rate limits.',
  keywords: [
    'Claude Code alternative',
    'Claude Code without limits',
    'AI coding endpoint',
    'LLM endpoint for coding',
    'Claude Code unlimited',
    'Cursor AI alternative',
    'OpenAI compatible endpoint',
    'Anthropic API alternative',
    'AI coding agent infrastructure',
    'Claude Code API',
  ],
  openGraph: {
    title: 'Umans Code – Claude Code Without Limits',
    description:
      'Drop-in LLM endpoint for Claude Code, Cursor, and OpenCode. Remove rate limits and code without interruptions.',
    url: 'https://umans.ai',
    siteName: 'Umans AI',
    images: [
      {
        url: 'https://app.umans.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Umans Code - Claude Code Without Limits',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umans Code – Claude Code Without Limits',
    description:
      'Drop-in LLM endpoint for Claude Code, Cursor, and OpenCode. Remove rate limits and code without interruptions.',
    images: ['https://app.umans.ai/og-image.png'],
    creator: '@umans_ai',
  },
  alternates: {
    canonical: 'https://umans.ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
