import Link from 'next/link';
import React, { memo } from 'react';
import type { Components } from 'react-markdown';
import { Streamdown } from 'streamdown';
import { ChevronRight } from 'lucide-react';
import {
  markdownComponents,
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from './markdown';

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
  const raw = rawText.replace(/\s+/g, ' ').trim();
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
    <div className="my-6 rounded-xl border border-border/60 bg-muted/20">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          <h2 className="text-base font-semibold">{heading}</h2>
        </summary>
        <div className="space-y-2 px-4 pb-4">
          {items.map((item, index) => {
            const pathLabel = item.path || item.raw;
            const linesLabel = item.lines;
            return (
              <div key={`${pathLabel}-${index}`} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 font-mono">
                    {pathLabel}
                  </span>
                  {linesLabel ? (
                    <span className="inline-flex items-center rounded-md border border-border/60 bg-background/80 px-2 py-1 font-mono">
                      {linesLabel}
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </div>
            );
          })}
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
