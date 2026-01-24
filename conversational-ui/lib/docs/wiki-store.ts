import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const bucketName = process.env.BLOB_BUCKET_NAME || '';

function createS3Client() {
  return new S3Client({
    region: process.env.BLOB_REGION || '',
    endpoint: process.env.BLOB_ENDPOINT || '',
    forcePathStyle: !!process.env.BLOB_ENDPOINT,
    credentials: {
      accessKeyId: process.env.BLOB_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.BLOB_READ_WRITE_TOKEN || '',
    },
  });
}

async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export type WikiPageEntry = {
  path?: string;
  purpose?: string;
};

export type RepoDocsConfig = {
  include?: string[];
  exclude?: string[];
};

export type WikiPageManifest = {
  pages?: WikiPageEntry[];
  wiki?: WikiPageEntry[];
  'repo-docs'?: RepoDocsConfig;
};

export const REPO_DOCS_PREFIX = 'repo-docs/';

export function stripRepoDocsPrefix(path: string): string {
  return path.startsWith(REPO_DOCS_PREFIX)
    ? path.slice(REPO_DOCS_PREFIX.length)
    : path;
}

export async function listWikiVersions(kbId: string): Promise<string[]> {
  if (!bucketName) {
    console.error('BLOB_BUCKET_NAME is not configured');
    return [];
  }

  const s3Client = createS3Client();
  const prefix = `base/${kbId}/docs/`;
  const seen = new Map<string, number>();
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const res = await s3Client.send(cmd);

    for (const obj of res.Contents ?? []) {
      const key = obj.Key;
      if (!key || !key.startsWith(prefix)) continue;
      const remainder = key.slice(prefix.length);
      if (!remainder) continue;
      const sha = remainder.split('/')[0]?.trim();
      if (!sha) continue;
      const lastModified = obj.LastModified ? obj.LastModified.getTime() : 0;
      const previous = seen.get(sha) ?? 0;
      if (lastModified >= previous) {
        seen.set(sha, lastModified);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return Array.from(seen.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([sha]) => sha);
}

export function getWikiPages(manifest: WikiPageManifest | null): WikiPageEntry[] {
  if (!manifest) return [];
  if (Array.isArray(manifest.wiki)) return manifest.wiki;
  if (Array.isArray(manifest.pages)) return manifest.pages;
  return [];
}

export async function getWikiManifest(
  kbId: string,
  commitSha: string,
): Promise<WikiPageManifest | null> {
  if (!bucketName) return null;
  const s3Client = createS3Client();
  const key = `base/${kbId}/docs/${commitSha}/.umans/docs.json`;
  try {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );
    const body = await streamToString(res.Body);
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      pages: Array.isArray(parsed.pages) ? parsed.pages : undefined,
      wiki: Array.isArray(parsed.wiki) ? parsed.wiki : undefined,
      'repo-docs': parsed['repo-docs'] ?? undefined,
    };
  } catch (error) {
    return null;
  }
}

export async function getWikiDocContent(
  kbId: string,
  commitSha: string,
  path: string,
): Promise<string | null> {
  if (!bucketName) return null;
  const s3Client = createS3Client();
  const basePrefix = `base/${kbId}/docs/${commitSha}/`;

  try {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: `${basePrefix}${path}` }),
    );
    return await streamToString(res.Body);
  } catch {
    if (!path.startsWith(REPO_DOCS_PREFIX)) {
      try {
        const res = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: `${basePrefix}${REPO_DOCS_PREFIX}${path}`,
          }),
        );
        return await streamToString(res.Body);
      } catch (error) {
        console.error('Error fetching doc file:', error);
        return null;
      }
    }
    return null;
  }
}

async function listMarkdownFiles(
  kbId: string,
  commitSha: string,
): Promise<string[]> {
  if (!bucketName) return [];
  const s3Client = createS3Client();
  const prefix = `base/${kbId}/docs/${commitSha}/`;
  let continuationToken: string | undefined = undefined;
  const files: string[] = [];
  do {
    const listCmd: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const res = await s3Client.send(listCmd);
    (res.Contents || []).forEach((obj) => {
      const key = obj.Key || '';
      if (key.endsWith('.md')) {
        files.push(key.substring(prefix.length));
      }
    });
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return files;
}

async function loadDocsMetadata(
  kbId: string,
  commitSha: string,
): Promise<Record<string, { origin?: string; process_id?: string }>> {
  if (!bucketName) return {};
  const s3Client = createS3Client();
  const prefix = `base/${kbId}/docs/${commitSha}/`;
  try {
    const metadataKey = `${prefix}__metadata__.json`;
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: metadataKey }),
    );
    const body = await streamToString(res.Body);
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    try {
      const originKey = `${prefix}__origins__.json`;
      const res = await s3Client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: originKey }),
      );
      const body = await streamToString(res.Body);
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        return Object.fromEntries(
          Object.entries(parsed).map(([path, origin]) => [
            path,
            { origin: origin as string },
          ]),
        );
      }
    } catch (originError) {
      return {};
    }
  }
  return {};
}

export async function listWikiFilesAndMetadata(
  kbId: string,
  commitSha: string,
): Promise<{
  files: string[];
  metadata: Record<string, { origin?: string; process_id?: string }>;
  manifest: WikiPageManifest | null;
}> {
  const files = await listMarkdownFiles(kbId, commitSha);
  files.sort((a, b) => a.localeCompare(b));
  const indexFirst = files.includes('index.md')
    ? ['index.md', ...files.filter((f) => f !== 'index.md')]
    : files;
  let orderedFiles = indexFirst;
  let manifest: WikiPageManifest | null = null;
  try {
    manifest = await getWikiManifest(kbId, commitSha);
    const wikiPages = getWikiPages(manifest);
    const order: string[] = wikiPages
      .map((page) => (typeof page?.path === 'string' ? page.path : null))
      .filter((path): path is string => typeof path === 'string')
      .map((path) =>
        path.toLowerCase().endsWith('.md') ? path : `${path}.md`,
      );
    const seen = new Set<string>();
    const ordered = order.filter((path) => {
      if (seen.has(path)) return false;
      if (!indexFirst.includes(path)) return false;
      seen.add(path);
      return true;
    });
    if (ordered.length > 0) {
      orderedFiles = [...ordered, ...indexFirst.filter((f) => !seen.has(f))];
    }
  } catch (orderError) {
    orderedFiles = indexFirst;
  }

  const rawMetadata = await loadDocsMetadata(kbId, commitSha);

  // Strip repo-docs/ prefix from paths for display
  const displayFiles = orderedFiles.map(stripRepoDocsPrefix);

  // Remap metadata keys to match display paths
  const metadata: Record<string, { origin?: string; process_id?: string }> = {};
  for (const [key, value] of Object.entries(rawMetadata)) {
    metadata[stripRepoDocsPrefix(key)] = value;
  }

  return { files: displayFiles, metadata, manifest };
}
