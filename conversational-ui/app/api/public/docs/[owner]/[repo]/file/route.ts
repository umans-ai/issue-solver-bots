import { NextResponse } from 'next/server';
import { getFeaturedRepoByOwnerAndName } from '@/lib/db/queries';
import { getWikiDocContent } from '@/lib/docs/wiki-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const versionOverride = searchParams.get('v');
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'path parameter is required' },
        { status: 400 },
      );
    }

    const featuredRepo = await getFeaturedRepoByOwnerAndName(owner, repo);
    if (!featuredRepo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // If versionOverride is a short SHA that matches the start of the full SHA in DB, use the full SHA
    let commitSha = featuredRepo.commitSha;
    if (versionOverride) {
      if (featuredRepo.commitSha.startsWith(versionOverride)) {
        commitSha = featuredRepo.commitSha;
      } else {
        commitSha = versionOverride;
      }
    }

    const content = await getWikiDocContent(featuredRepo.kbId, commitSha, path);

    if (!content) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 },
      );
    }

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : null;

    return NextResponse.json({
      owner: featuredRepo.owner,
      name: featuredRepo.name,
      commitSha,
      path,
      content,
      title,
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 },
    );
  }
}
