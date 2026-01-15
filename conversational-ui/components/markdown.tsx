import Link from 'next/link';
import React, { memo } from 'react';
import type { Components } from 'react-markdown';
import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';

const markInlineCode = (node: any, parent: any) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'element' && node.tagName === 'code') {
    const isInline = parent?.tagName !== 'pre';
    node.properties = {
      ...(node.properties || {}),
      'data-inline': isInline ? 'true' : 'false',
    };
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => markInlineCode(child, node));
  }
};

const rehypeInlineCode = () => {
  return (tree: any) => {
    markInlineCode(tree, null);
  };
};

export const markdownComponents: Partial<Components> = {
  code: ({ node, inline, className, children, ...props }: any) => {
    const codeContent = String(children).replace(/\n$/, '');
    const position = node?.position;
    const spansMultipleLines =
      typeof position?.start?.line === 'number' &&
      typeof position?.end?.line === 'number' &&
      position.end.line > position.start.line;
    const inlineProp = node?.properties?.['data-inline'];
    const hasInlineProp = inlineProp !== undefined;
    const inlineFromProp = inlineProp === 'true' || inlineProp === true;
    const isInline =
      inline === true ||
      inlineFromProp ||
      node?.type === 'inlineCode' ||
      (!hasInlineProp &&
        !className &&
        !spansMultipleLines &&
        !codeContent.includes('\n'));
    const resolvedClassName =
      !isInline && !className ? 'language-text' : className;
    const match = /language-(\w+)/.exec(resolvedClassName || '');
    const language = match?.[1] || '';

    // Handle Mermaid diagrams
    if (language === 'mermaid') {
      return (
        <MermaidDiagram code={codeContent} className="w-full overflow-x-auto" />
      );
    }

    // Handle regular code blocks
    return (
      <CodeBlock
        node={node}
        inline={isInline}
        className={resolvedClassName}
        {...props}
      >
        {children}
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>,
  p: ({ children, ...props }) => {
    return (
      <div className="w-full overflow-hidden" {...props}>
        {children}
      </div>
    );
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside pl-[2.5em]" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside pl-[2.5em]" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
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
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
};

export const markdownRemarkPlugins = [remarkGfm];
export const markdownRehypePlugins = [rehypeInlineCode];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const defaultOrigin =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return (
    <div className="w-full overflow-hidden">
      <Streamdown
        defaultOrigin={defaultOrigin}
        allowedLinkPrefixes={['*']}
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={markdownComponents}
      >
        {children}
      </Streamdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
