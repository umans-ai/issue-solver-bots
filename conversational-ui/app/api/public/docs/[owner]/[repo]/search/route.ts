import { NextResponse } from 'next/server';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { getFeaturedRepoByOwnerAndName } from '@/lib/db/queries';

function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const versionOverride = searchParams.get('v');
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json(
        { error: 'q parameter is required' },
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
    const kbId = featuredRepo.kbId;

    const BUCKET_NAME = process.env.BLOB_BUCKET_NAME || '';
    const s3Client = new S3Client({
      region: process.env.BLOB_REGION || '',
      endpoint: process.env.BLOB_ENDPOINT || '',
      forcePathStyle: !!process.env.BLOB_ENDPOINT,
      credentials: {
        accessKeyId: process.env.BLOB_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.BLOB_READ_WRITE_TOKEN || '',
      },
    });

    const prefix = `base/${kbId}/docs/${commitSha}/`;
    const listed = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix }),
    );
    const contents = listed.Contents || [];
    const mdFiles = contents.filter((obj) => (obj.Key || '').endsWith('.md'));

    const MAX_RESULTS_PER_FILE = 5;
    const MAX_TOTAL_RESULTS = 60;

    const results: {
      path: string;
      snippet: string;
      line?: number;
      occurrence?: number;
      offset?: number;
    }[] = [];

    for (const obj of mdFiles) {
      const key = obj.Key!;
      const get = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      );
      const text = await streamToString(get.Body);
      const lowerText = text.toLowerCase();
      const queryLower = q.toLowerCase();
      let searchIndex = 0;
      let matchCountForFile = 0;

      while (matchCountForFile < MAX_RESULTS_PER_FILE) {
        const idx = lowerText.indexOf(queryLower, searchIndex);
        if (idx === -1) break;

        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + q.length + 60);
        const snippet = text.substring(start, end).replace(/\n/g, ' ');
        const relative = key.replace(prefix, '');
        const before = text.slice(0, idx);
        const line = before.split('\n').length;
        const occurrence = matchCountForFile;

        results.push({
          path: relative,
          snippet,
          line,
          occurrence,
          offset: idx,
        });

        matchCountForFile += 1;
        if (results.length >= MAX_TOTAL_RESULTS) break;
        searchIndex = idx + q.length;
      }

      if (results.length >= MAX_TOTAL_RESULTS) break;
    }

    return NextResponse.json({
      owner: featuredRepo.owner,
      name: featuredRepo.name,
      commitSha,
      query: q,
      results,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search documentation' },
      { status: 500 },
    );
  }
}
