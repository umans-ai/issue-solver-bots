import Link from 'next/link';
import React, { memo } from 'react';
import type { Components } from 'react-markdown';
import { Streamdown } from 'streamdown';
import { ChevronRight, CodeXml } from 'lucide-react';
import {
  markdownComponents,
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from './markdown';
import { getFileExtension, getLanguageIcon } from './sources';

type SourceItem = {
  path?: string;
  lines?: string;
  description?: string;
  raw: string;
};

const SOURCE_HEADINGS = new Set([
  'relevant source files',
  'source evidence',
  'sources',
]);

const normalizeHeading = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/:$/, '')
    .toLowerCase();

const getNodeText = (node: any): string => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (typeof node.value === 'number') return String(node.value);
  if (typeof node.type === 'string' && node.type === 'text') {
    return node.value || '';
  }
  if (Array.isArray(node.children)) {
    return node.children.map(getNodeText).join('');
  }
  return '';
};

const splitDescription = (text: string): { left: string; right?: string } => {
  const match = text.match(/\s[—-]\s/);
  if (!match || match.index === undefined) {
    return { left: text };
  }
  const left = text.slice(0, match.index).trim();
  const right = text.slice(match.index + match[0].length).trim();
  return { left, right };
};

const parseSourceItem = (rawText: string): SourceItem | null => {
  const raw = rawText.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const { left, right } = splitDescription(raw);
  const match = left.match(/^(.*?):\s*(L?\d+(?:-L?\d+)?)$/);
  if (match) {
    return {
      path: match[1].trim(),
      lines: match[2].trim(),
      description: right,
      raw,
    };
  }
  return {
    path: left.trim(),
    description: right,
    raw,
  };
};

const extractSourcesSection = (markdown: string) => {
  const lines = markdown.split(/\r?\n/);
  let startIndex = -1;
  let headingText = '';
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^##\s+(.*)$/);
    if (!match) continue;
    const heading = match[1].trim().replace(/:$/, '');
    if (SOURCE_HEADINGS.has(normalizeHeading(heading))) {
      startIndex = i;
      headingText = heading;
      break;
    }
  }
  if (startIndex === -1) {
    return { before: markdown, after: '', sources: null };
  }
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s+\S+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  const blockLines = lines.slice(startIndex + 1, endIndex);
  const items: SourceItem[] = [];
  let current: string[] | null = null;
  const flushCurrent = () => {
    if (!current) return;
    const raw = current.join(' ').replace(/\s+/g, ' ').trim();
    const parsed = parseSourceItem(raw);
    if (parsed) items.push(parsed);
    current = null;
  };
  for (const line of blockLines) {
    const bulletMatch = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      flushCurrent();
      current = [bulletMatch[1].trim()];
      continue;
    }
    if (!current) continue;
    if (line.trim() === '') continue;
    current.push(line.trim());
  }
  flushCurrent();
  if (items.length === 0) {
    return { before: markdown, after: '', sources: null };
  }
  const before = lines.slice(0, startIndex).join('\n').trimEnd();
  const after = lines.slice(endIndex).join('\n').trimStart();
  return {
    before,
    after,
    sources: { heading: headingText || 'Sources', items },
  };
};

const SourcesBlock = ({
  heading,
  items,
}: {
  heading: string;
  items: SourceItem[];
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="my-4 rounded-lg border border-border/40 bg-muted/10">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-foreground/90">
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          <h2 className="m-0 text-sm font-semibold leading-none">{heading}</h2>
        </summary>
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-2">
          {items.map((item, index) => {
            const pathLabel = item.path || item.raw;
            const linesLabel = item.lines;
            const extension = getFileExtension(pathLabel);
            const languageIcon = getLanguageIcon(extension);
            return (
              <div key={`${pathLabel}-${index}`} className="flex flex-col gap-0.5">
                <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-foreground/80 w-fit">
                  {languageIcon ? (
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <img
                        src={languageIcon}
                        alt={`${extension} file`}
                        className="h-3.5 w-3.5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback =
                            target.parentElement?.querySelector('.fallback-icon');
                          if (fallback) {
                            (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <span
                        className="fallback-icon absolute inset-0 hidden items-center justify-center"
                        style={{ display: 'none' }}
                      >
                        <CodeXml className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </span>
                  ) : (
                    <CodeXml className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="font-mono">{pathLabel}</span>
                  {linesLabel ? (
                    <span className="text-muted-foreground">{linesLabel}</span>
                  ) : null}
                </div>
                {item.description ? (
                  <div className="ml-4 border-l border-border/50 pl-3 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/50">↳</span>{' '}
                    {item.description}
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      </details>
    </div>
  );
};

const components = {
  ...markdownComponents,
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
} as Partial<Components>;

const remarkPlugins = [...markdownRemarkPlugins];
const rehypePlugins = [...markdownRehypePlugins];

const NonMemoizedDocsMarkdown = ({ children }: { children: string }) => {
  const defaultOrigin =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const { before, after, sources } = extractSourcesSection(children);
  const renderMarkdown = (content: string) =>
    content.trim() ? (
      <Streamdown
        defaultOrigin={defaultOrigin}
        allowedLinkPrefixes={['*']}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </Streamdown>
    ) : null;
  return (
    <div className="w-full overflow-hidden">
      {sources ? renderMarkdown(before) : null}
      {sources ? (
        <SourcesBlock heading={sources.heading} items={sources.items} />
      ) : null}
      {sources ? renderMarkdown(after) : renderMarkdown(children)}
    </div>
  );
};

export const DocsMarkdown = memo(
  NonMemoizedDocsMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
