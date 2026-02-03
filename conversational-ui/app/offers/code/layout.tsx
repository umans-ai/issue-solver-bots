import type { Metadata } from 'next';
import Script from 'next/script';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'code by Umans',
      applicationCategory: 'DeveloperApplication',
      description:
        'A managed Claude Code-compatible endpoint running top open-source coding models. Drop-in replacement for Claude Code CLI without usage limits.',
      url: 'https://app.umans.ai/offers/code',
      operatingSystem: 'Cross-platform',
      offers: [
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '20',
          priceCurrency: 'USD',
          description: '200 Claude Code prompts per five-hour window',
          url: 'https://app.umans.ai/offers/code#plans',
        },
        {
          '@type': 'Offer',
          name: 'Max',
          price: '50',
          priceCurrency: 'USD',
          description: 'Unlimited prompts with 4 guaranteed parallel sessions',
          url: 'https://app.umans.ai/offers/code#plans',
        },
      ],
      provider: {
        '@type': 'Organization',
        name: 'Umans AI',
        url: 'https://umans.ai',
        sameAs: [
          'https://x.com/umans_ai',
          'https://www.linkedin.com/company/umans-ai',
          'https://discord.gg/Q5hdNrk7Rw',
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are the usage limits for code by Umans?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pro plan offers 200 Claude Code prompts per five-hour rolling window. Max plan offers unlimited prompts with 4 guaranteed parallel sessions and extra burst capacity when available.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does code by Umans compare to Claude Code?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'code by Umans is a drop-in replacement for Claude Code. It uses the same CLI workflow and tools but runs on a managed endpoint with higher or unlimited usage limits. Benchmarks show performance competitive with Claude Sonnet 4.5 and Opus 4.5.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I set up code by Umans?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Setup takes under 2 minutes: Subscribe to a plan, get your API key, point Claude Code to the Umans endpoint, and continue working as usual.',
          },
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: 'code by Umans | Claude Code without limits',
  description:
    'Get Claude Code without usage limits. A managed endpoint running top open-source coding models, starting at $20/month. Drop-in compatible with Claude Code CLI.',
  openGraph: {
    title: 'code by Umans | Claude Code without limits',
    description:
      'Get Claude Code without usage limits. A managed endpoint running top open-source coding models, starting at $20/month. Drop-in compatible with Claude Code CLI.',
    url: 'https://app.umans.ai/offers/code',
    siteName: 'Umans AI',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://app.umans.ai/og-code.png',
        width: 1200,
        height: 630,
        alt: 'code by Umans - Claude Code without limits',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'code by Umans | Claude Code without limits',
    description:
      'Get Claude Code without usage limits. A managed endpoint running top open-source coding models, starting at $20/month. Drop-in compatible with Claude Code CLI.',
    creator: '@umans_ai',
    images: ['https://app.umans.ai/og-code.png'],
  },
  alternates: {
    canonical: 'https://app.umans.ai/offers/code',
  },
  keywords: [
    'Claude Code',
    'Claude Code alternative',
    'Claude Code without limits',
    'unlimited Claude Code',
    'coding agents',
    'AI coding assistant',
    'managed LLM endpoint',
    'open-source coding model',
    'agentic coding',
    'AI pair programming',
    'code generation API',
  ],
};

export default function CodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        id="code-offer-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
