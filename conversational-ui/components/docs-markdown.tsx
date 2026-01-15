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

type SourcesBlockData = {
  heading: string;
  items: SourceItem[];
};

type SourcesBlockNode = {
  type: 'sourcesBlock';
  data?: SourcesBlockData;
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

const remarkSourcesBlock = () => {
  return (tree: any) => {
    if (!tree || !Array.isArray(tree.children)) return;
    const nextChildren: any[] = [];
    const children = tree.children;
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (node?.type === 'heading') {
        const headingText = getNodeText(node);
        if (SOURCE_HEADINGS.has(normalizeHeading(headingText))) {
          const nextNode = children[i + 1];
          if (nextNode?.type === 'list') {
            const items = (nextNode.children || [])
              .map((item: any) => getNodeText(item))
              .map(parseSourceItem)
              .filter((item: SourceItem | null) => item !== null) as SourceItem[];
            if (items.length > 0) {
              nextChildren.push({
                type: 'sourcesBlock',
                data: {
                  heading: headingText.replace(/:$/, '').trim(),
                  items,
                },
              });
              i += 1;
              continue;
            }
          }
        }
      }
      nextChildren.push(node);
    }
    tree.children = nextChildren;
  };
};

const SourcesBlock = ({ node }: { node?: SourcesBlockNode }) => {
  const data = node?.data;
  if (!data || !data.items || data.items.length === 0) return null;
  return (
    <div className="my-6 rounded-xl border border-border/60 bg-muted/20">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          <span>{data.heading}</span>
        </summary>
        <div className="space-y-2 px-4 pb-4">
          {data.items.map((item, index) => {
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

const components: Partial<Components> & { sourcesBlock: React.FC<any> } = {
  ...markdownComponents,
  sourcesBlock: SourcesBlock,
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
};

const remarkPlugins = [...markdownRemarkPlugins, remarkSourcesBlock];

const NonMemoizedDocsMarkdown = ({ children }: { children: string }) => {
  const defaultOrigin =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return (
    <div className="w-full overflow-hidden">
      <Streamdown
        defaultOrigin={defaultOrigin}
        allowedLinkPrefixes={['*']}
        remarkPlugins={remarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={components}
      >
        {children}
      </Streamdown>
    </div>
  );
};

export const DocsMarkdown = memo(
  NonMemoizedDocsMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
