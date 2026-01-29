import { NextResponse } from 'next/server';
import { getFeaturedRepoByOwnerAndName } from '@/lib/db/queries';
import { listWikiVersions } from '@/lib/docs/wiki-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const versionOverride = searchParams.get('v');

    const featuredRepo = await getFeaturedRepoByOwnerAndName(owner, repo);
    if (!featuredRepo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const versions = await listWikiVersions(featuredRepo.kbId);
    const currentVersion = versionOverride || featuredRepo.commitSha;

    return NextResponse.json({
      owner: featuredRepo.owner,
      name: featuredRepo.name,
      repoUrl: featuredRepo.repoUrl,
      description: featuredRepo.description,
      language: featuredRepo.language,
      stars: featuredRepo.stars,
      kbId: featuredRepo.kbId,
      indexedAt: featuredRepo.indexedAt,
      currentVersion,
      versions,
    });
  } catch (error) {
    console.error('Error fetching repo metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repository metadata' },
      { status: 500 },
    );
  }
}
