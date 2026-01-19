import { NextResponse } from 'next/server';
import { listWikiFilesAndMetadata } from '@/lib/docs/wiki-store';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kbId =
      searchParams.get('kbId') || session.user.selectedSpace?.knowledgeBaseId;
    const commitSha = searchParams.get('commitSha');
    if (!kbId || !commitSha)
      return NextResponse.json(
        { error: 'kbId and commitSha are required' },
        { status: 400 },
      );

    const { files, metadata } = await listWikiFilesAndMetadata(
      kbId,
      commitSha,
    );

    return NextResponse.json({ files, metadata });
  } catch (error) {
    console.error('List docs error', error);
    return NextResponse.json({ error: 'Failed to list docs' }, { status: 500 });
  }
}
