import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Umans Wiki | Turn any repo into a living wiki',
  description: 'Auto-generated documentation grounded in source code. Ask questions, understand architecture, and share knowledge with your team. Always up-to-date.',
  openGraph: {
    title: 'Umans Wiki | Turn any repo into a living wiki',
    description: 'Auto-generated documentation grounded in source code. Ask questions, understand architecture, and share knowledge with your team.',
    url: 'https://app.umans.ai/offers/wiki',
    siteName: 'Umans AI',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://app.umans.ai/og-wiki.png',
        width: 1200,
        height: 630,
        alt: 'Umans Wiki - Auto-generated documentation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umans Wiki | Turn any repo into a living wiki',
    description: 'Auto-generated documentation grounded in source code. Ask questions, understand architecture, and share knowledge with your team.',
    creator: '@umans_ai',
    images: ['https://app.umans.ai/og-wiki.png'],
  },
  alternates: {
    canonical: '/offers/wiki',
  },
  keywords: [
    'documentation',
    'wiki',
    'auto-generated docs',
    'code analysis',
    'AI documentation',
    'software engineering',
    'developer tools',
    'living documentation',
    'repo to wiki',
  ],
};

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
