import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
import {
  getWikiDocContent,
  getWikiManifest,
  listWikiVersions,
} from '@/lib/docs/wiki-store';

// Define the query type enum with detailed descriptions
const QueryTypeEnum = z.enum(['codebase_summary', 'adr', 'glossary']);

// Descriptions for each query type
const queryTypeDescriptions = {
  codebase_summary:
    'Returns a summary of the codebase, including the main features, technologies used, and the overall structure.',
  adr: 'Returns Architectural Decision Records (ADRs), coding guidelines, and standards that govern the development of the codebase.',
  glossary:
    'Returns the Ubiquitous Language Glossary that maps technical code terms to business concept terms, facilitating consistent understanding across technical and domain contexts.',
};

// Map query types to their corresponding S3 file keys base names
// The complete path will be constructed with user-specific space information
const queryTypeToFileBaseMap = {
  codebase_summary: 'digest_small.txt',
  adr: 'adrs.txt',
  glossary: 'glossary.txt',
};

// Interface for codebaseAssistant props
interface CodebaseAssistantProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const codebaseAssistant = ({ session }: CodebaseAssistantProps) =>
  tool({
    description:
      'Retrieve information about the codebase of the current project.',
    inputSchema: z.object({
      query: QueryTypeEnum.describe(
        `The type of codebase information to retrieve: \n- codebase_summary: ${queryTypeDescriptions.codebase_summary}\n- adr: ${queryTypeDescriptions.adr}\n- glossary: ${queryTypeDescriptions.glossary}`,
      ),
    }),
    execute: async ({ query }) => {
      const userId = session.user?.id || 'anonymous';
      const kbId = session.user?.selectedSpace?.knowledgeBaseId;

      const codebaseContent = await getCodebaseContent(query, userId, kbId);
      return codebaseContent || 'No response was generated. Please try again.';
    },
  });

const wikiQueryHints: Record<
  z.infer<typeof QueryTypeEnum>,
  string[]
> = {
  codebase_summary: [
    'overview',
    'summary',
    'architecture',
    'system',
    'introduction',
  ],
  adr: ['adr', 'decision', 'architecture decision', 'record'],
  glossary: ['glossary', 'terms', 'ubiquitous'],
};

const maxPagesByQuery: Record<z.infer<typeof QueryTypeEnum>, number> = {
  codebase_summary: 2,
  adr: 2,
  glossary: 1,
};

async function getWikiContent(
  queryType: z.infer<typeof QueryTypeEnum>,
  kbId: string,
): Promise<string | null> {
  const versions = await listWikiVersions(kbId);
  const latest = versions.at(-1);
  if (!latest) return null;
  const manifest = await getWikiManifest(kbId, latest);
  const pages = Array.isArray(manifest?.pages) ? manifest?.pages : [];
  if (pages.length === 0) return null;

  const keywords = wikiQueryHints[queryType];
  const scored = pages.map((page) => {
    const path = typeof page.path === 'string' ? page.path : '';
    const purpose = typeof page.purpose === 'string' ? page.purpose : '';
    const haystack = `${path} ${purpose}`.toLowerCase();
    const score = keywords.reduce(
      (total, keyword) => total + (haystack.includes(keyword) ? 1 : 0),
      0,
    );
    return { path, purpose, score };
  });
  const matched = scored.filter((page) => page.score > 0);
  const ordered = (matched.length > 0 ? matched : scored).sort(
    (a, b) => b.score - a.score,
  );
  const selected = ordered
    .filter((page) => page.path)
    .slice(0, maxPagesByQuery[queryType]);

  if (selected.length === 0) return null;

  const sections: string[] = [];
  for (const page of selected) {
    const path = page.path.toLowerCase().endsWith('.md')
      ? page.path
      : `${page.path}.md`;
    const content = await getWikiDocContent(kbId, latest, path);
    if (!content) continue;
    const header = `# ${path}`;
    const purpose = page.purpose
      ? `Purpose: ${page.purpose}`
      : undefined;
    sections.push([header, purpose, content].filter(Boolean).join('\n\n'));
  }

  if (sections.length === 0) return null;
  return sections.join('\n\n---\n\n');
}

async function getLegacyCodebaseContent(
  queryType: z.infer<typeof QueryTypeEnum>,
  userId: string,
): Promise<string | null> {
  const s3Client = new S3Client({
    region: process.env.BLOB_REGION || '',
    endpoint: process.env.BLOB_ENDPOINT || '',
    forcePathStyle: !!process.env.BLOB_ENDPOINT,
    credentials: {
      accessKeyId: process.env.BLOB_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.BLOB_READ_WRITE_TOKEN || '',
    },
  });

  const bucketName = process.env.BLOB_BUCKET_NAME || '';

  try {
    const baseFileName = queryTypeToFileBaseMap[queryType];
    const fileKey = `spaces/${userId}/${baseFileName}`;
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    const response = await s3Client.send(command);
    if (response.Body) {
      return response.Body.transformToString();
    }
    console.error(`S3 response body is empty for ${fileKey}`);
    return null;
  } catch (error) {
    console.error(`Error reading file for query type ${queryType}:`, error);
    return null;
  }
}

export async function getCodebaseContent(
  queryType: z.infer<typeof QueryTypeEnum>,
  userId = 'anonymous',
  kbId?: string | null,
): Promise<string | null> {
  if (kbId) {
    const wikiContent = await getWikiContent(queryType, kbId);
    if (wikiContent) return wikiContent;
  }
  return getLegacyCodebaseContent(queryType, userId);
}
