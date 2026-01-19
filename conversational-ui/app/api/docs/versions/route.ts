import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { listWikiVersions } from '@/lib/docs/wiki-store';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kbId =
      searchParams.get('kbId') || session.user.selectedSpace?.knowledgeBaseId;
    if (!kbId)
      return NextResponse.json({ error: 'kbId is required' }, { status: 400 });

    const versions = await listWikiVersions(kbId);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error listing versions:', error);
    return NextResponse.json(
      { error: 'Failed to list versions' },
      { status: 500 },
    );
  }
}
