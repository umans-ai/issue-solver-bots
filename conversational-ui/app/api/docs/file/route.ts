import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getWikiDocContent } from '@/lib/docs/wiki-store';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kbId =
      searchParams.get('kbId') || session.user.selectedSpace?.knowledgeBaseId;
    const commitSha = searchParams.get('commitSha');
    const path = searchParams.get('path');

    if (!kbId || !commitSha || !path) {
      return NextResponse.json(
        { error: 'kbId, commitSha and path are required' },
        { status: 400 },
      );
    }

    const bodyString = await getWikiDocContent(kbId, commitSha, path);
    if (!bodyString) {
      return NextResponse.json(
        { error: 'Failed to fetch file' },
        { status: 500 },
      );
    }

    // Extract first H1 as title
    const titleMatch = bodyString.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : null;
    return NextResponse.json({ content: bodyString, title });
  } catch (error: any) {
    console.error('Error fetching doc file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 },
    );
  }
}
