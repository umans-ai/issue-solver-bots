import { Suspense } from 'react';
import { auth } from '@/app/(auth)/auth';
import { getLatestPledgeForUser } from '@/lib/db/queries';
import { CodeLandingPageContent } from './code-landing-content';

export const dynamic = 'force-dynamic';

async function CodeLandingPage() {
  const session = await auth();
  const user = session?.user || undefined;

  let plan: 'code_pro' | 'code_max' | null = null;
  if (user?.id) {
    const pledge = await getLatestPledgeForUser(user.id);
    if (pledge && pledge.status !== 'canceled' && pledge.status !== 'expired') {
      plan = pledge.plan as 'code_pro' | 'code_max';
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CodeLandingPageContent user={user} plan={plan} />
    </Suspense>
  );
}

export default CodeLandingPage;
