import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
import {
  getWikiDocContent,
  getWikiManifest,
  listWikiVersions,
} from '@/lib/docs/wiki-store';

// Interface for codebaseAssistant props
interface CodebaseAssistantProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

type ManifestPage = {
  path?: string;
  purpose?: string;
};

type ManifestInfo = {
  version: string;
  pages: ManifestPage[];
};

export const codebaseAssistant = async ({ session }: CodebaseAssistantProps) => {
  const kbId = session.user?.selectedSpace?.knowledgeBaseId;
  const manifestInfo = kbId ? await loadManifestInfo(kbId) : null;
  const manifestSummary = manifestInfo
    ? formatManifestSummary(manifestInfo.pages)
    : null;

  const descriptionParts = [
    'Retrieve information about the codebase using wiki documentation.',
    manifestSummary
      ? [
          'Here are the available wiki pages generated from documentation prompts:',
          manifestSummary,
          'Use these page paths when selecting pages to fetch.',
        ].join('\n')
      : 'No wiki manifest is available for the current space.',
  ];

  return tool({
    description: descriptionParts.join('\n\n'),
    inputSchema: z.object({
      pages: z
        .array(z.string().min(1))
        .min(1)
        .describe(
          'One or more wiki page paths from the manifest. Prefer the exact path from the list.',
        ),
    }),
    execute: async ({ pages }) => {
      if (!kbId) {
        return 'No knowledge base found for this user. Please connect a repository first.';
      }
      if (!manifestInfo) {
        return 'No wiki manifest was found for this space.';
      }

      const selected = matchManifestPages(pages, manifestInfo.pages);
      if (selected.length === 0) {
        return 'No matching wiki pages found for the requested paths.';
      }

      const sections: string[] = [];
      for (const page of selected) {
        const docPath = normalizeDocPath(page.path ?? '');
        if (!docPath) continue;
        const content = await getWikiDocContent(
          kbId,
          manifestInfo.version,
          docPath,
        );
        if (!content) continue;
        const header = `# ${docPath}`;
        const purpose = page.purpose ? `Purpose: ${page.purpose}` : undefined;
        sections.push([header, purpose, content].filter(Boolean).join('\n\n'));
      }

      if (sections.length === 0) {
        return 'No wiki content was returned for the requested pages.';
      }
      return sections.join('\n\n---\n\n');
    },
  });
};

async function loadManifestInfo(kbId: string): Promise<ManifestInfo | null> {
  const versions = await listWikiVersions(kbId);
  const latest = versions.at(-1);
  if (!latest) return null;
  const manifest = await getWikiManifest(kbId, latest);
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  if (pages.length === 0) return null;
  return { version: latest, pages };
}

function formatManifestSummary(pages: ManifestPage[]): string | null {
  const lines = pages
    .map((page) => {
      const path = typeof page.path === 'string' ? page.path.trim() : '';
      if (!path) return null;
      const purpose =
        typeof page.purpose === 'string' && page.purpose.trim()
          ? page.purpose.trim()
          : '';
      return purpose ? `- ${path} - ${purpose}` : `- ${path}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return null;
  return lines.join('\n');
}

function normalizeDocPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().endsWith('.md')
    ? trimmed
    : `${trimmed}.md`;
}

function normalizeMatchKey(path: string): string {
  return path.trim().replace(/^\/+/, '').toLowerCase();
}

function matchManifestPages(
  requested: string[],
  pages: ManifestPage[],
): ManifestPage[] {
  const pageByPath = new Map<string, ManifestPage>();
  const pageByBase = new Map<string, ManifestPage>();

  for (const page of pages) {
    const rawPath = typeof page.path === 'string' ? page.path.trim() : '';
    if (!rawPath) continue;
    const normalized = normalizeMatchKey(rawPath);
    pageByPath.set(normalized, page);
    const base = normalized.endsWith('.md')
      ? normalized.slice(0, -3)
      : normalized;
    pageByBase.set(base, page);
  }

  const matches: ManifestPage[] = [];
  const seen = new Set<ManifestPage>();
  for (const entry of requested) {
    const normalized = normalizeMatchKey(entry);
    if (!normalized) continue;
    const base = normalized.endsWith('.md')
      ? normalized.slice(0, -3)
      : normalized;
    const match =
      pageByPath.get(normalized) || pageByBase.get(base);
    if (match && !seen.has(match)) {
      matches.push(match);
      seen.add(match);
    }
  }

  return matches;
}
