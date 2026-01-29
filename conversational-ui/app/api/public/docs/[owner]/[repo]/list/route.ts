import { NextResponse } from 'next/server';
import { getFeaturedRepoByOwnerAndName } from '@/lib/db/queries';
import {
  listWikiFilesAndMetadata,
  getWikiDocContent,
} from '@/lib/docs/wiki-store';
import { extractTitle } from '@/lib/docs/title-utils';

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

    // If versionOverride is a short SHA that matches the start of the full SHA in DB, use the full SHA
    let commitSha = featuredRepo.commitSha;
    if (versionOverride) {
      if (featuredRepo.commitSha.startsWith(versionOverride)) {
        commitSha = featuredRepo.commitSha;
      } else {
        commitSha = versionOverride;
      }
    }

    const { files, metadata, manifest } = await listWikiFilesAndMetadata(
      featuredRepo.kbId,
      commitSha,
    );

    const titleEntries = await Promise.all(
      files.map(async (path) => {
        try {
          const content = await getWikiDocContent(
            featuredRepo.kbId,
            commitSha,
            path,
          );
          if (!content) return [path, path] as const;
          return [path, extractTitle(content, path)] as const;
        } catch {
          return [path, path] as const;
        }
      }),
    );
    const titles = Object.fromEntries(titleEntries);

    return NextResponse.json({
      owner: featuredRepo.owner,
      name: featuredRepo.name,
      commitSha,
      files,
      metadata,
      titles,
      manifest,
    });
  } catch (error) {
    console.error('Error listing docs:', error);
    return NextResponse.json(
      { error: 'Failed to list documentation files' },
      { status: 500 },
    );
  }
}
