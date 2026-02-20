import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Umans Workspace – Chat and tasks for software teams',
  description:
    'Umans Workspace helps software teams understand large codebases faster, offload repetitive fixes to remote agents that open PRs, and keep docs and architecture diagrams in sync with the code.',
  openGraph: {
    title: 'Umans Workspace – Chat and tasks for software teams',
    description:
      'Umans Workspace helps software teams understand large codebases faster, offload repetitive fixes to remote agents that open PRs, and keep docs and architecture diagrams in sync with the code.',
    url: 'https://umans.ai/offers/workspace',
    siteName: 'Umans AI',
    images: [
      {
        url: 'https://app.umans.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Umans Workspace',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umans Workspace – Chat and tasks for software teams',
    description:
      'Umans Workspace helps software teams understand large codebases faster, offload repetitive fixes to remote agents that open PRs, and keep docs and architecture diagrams in sync with the code.',
    images: ['https://app.umans.ai/og-image.png'],
    creator: '@umans_ai',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
