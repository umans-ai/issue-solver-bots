import { NextResponse } from 'next/server';
import {
  getWikiDocContent,
  listWikiFilesAndMetadata,
} from '@/lib/docs/wiki-store';
import { auth } from '@/app/(auth)/auth';

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return fallback;
}

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

    const titleEntries = await Promise.all(
      files.map(async (path) => {
        try {
          const content = await getWikiDocContent(kbId, commitSha, path);
          if (!content) return [path, path] as const;
          return [path, extractTitle(content, path)] as const;
        } catch {
          return [path, path] as const;
        }
      }),
    );
    const titles = Object.fromEntries(titleEntries);

    return NextResponse.json({ files, metadata, titles });
  } catch (error) {
    console.error('List docs error', error);
    return NextResponse.json({ error: 'Failed to list docs' }, { status: 500 });
  }
}
