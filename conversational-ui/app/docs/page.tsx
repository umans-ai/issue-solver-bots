import { redirect } from 'next/navigation';

import { DocsEmptyState } from '@/components/docs-empty-state';
import { auth } from '../(auth)/auth';

export default async function DocsRootPage() {
  const session = await auth();
  const kbId = session?.user?.selectedSpace?.knowledgeBaseId;

  if (!kbId) {
    return <DocsEmptyState />;
  }

  redirect(`/docs/${encodeURIComponent(kbId)}`);
}
