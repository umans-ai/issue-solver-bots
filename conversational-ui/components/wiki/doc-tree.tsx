'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export type DocFileEntry = {
  path: string;
  title: string;
  origin?: string;
};

export type DocFolderNode = {
  id: string;
  name: string;
  label: string;
  children: DocFolderNode[];
  files: DocFileEntry[];
  orderIndex?: number;
};

type DocTreeProps = {
  wikiRoot: DocFolderNode;
  otherRoot: DocFolderNode;
  activePath: string | null;
  titleMap: Record<string, string>;
  onSelectPath: (path: string) => void;
  onPrefetchPath?: (path: string) => void;
  isLoading?: boolean;
};

function FileEntry({
  entry,
  isActive,
  onSelect,
  onPrefetch,
}: {
  entry: DocFileEntry;
  isActive: boolean;
  onSelect: () => void;
  onPrefetch?: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors ${
        isActive
          ? 'text-primary font-semibold'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onSelect}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <span className="text-sm leading-snug">{entry.title}</span>
      {entry.origin !== 'auto' && (
        <span className="text-[11px] text-muted-foreground/70 leading-tight">
          {entry.path}
        </span>
      )}
    </button>
  );
}

function FolderNode({
  node,
  activePath,
  titleMap,
  onSelectPath,
  onPrefetchPath,
}: {
  node: DocFolderNode;
  activePath: string | null;
  titleMap: Record<string, string>;
  onSelectPath: (path: string) => void;
  onPrefetchPath?: (path: string) => void;
}) {
  const label = node.label || node.name;
  const isRepoDocs =
    node.name.toLowerCase() === 'repo-docs' ||
    label.toLowerCase() === 'repo docs';

  return (
    <details key={node.id} className="group space-y-1" open={!isRepoDocs}>
      <summary className="flex cursor-pointer items-center justify-between px-3 py-1 text-sm font-semibold text-foreground list-none">
        <span>{label}</span>
        <ChevronDown
          aria-hidden="true"
          className="docs-index-caret h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="mt-1 space-y-1 pl-3">
        {node.files.map((file) => (
          <FileEntry
            key={file.path}
            entry={file}
            isActive={activePath === file.path}
            onSelect={() => onSelectPath(file.path)}
            onPrefetch={() => onPrefetchPath?.(file.path)}
          />
        ))}
        {node.children.map((child) => (
          <FolderNode
            key={child.id}
            node={child}
            activePath={activePath}
            titleMap={titleMap}
            onSelectPath={onSelectPath}
            onPrefetchPath={onPrefetchPath}
          />
        ))}
      </div>
    </details>
  );
}

export function DocTree({
  wikiRoot,
  otherRoot,
  activePath,
  titleMap,
  onSelectPath,
  onPrefetchPath,
  isLoading,
}: DocTreeProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 px-3">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="h-4 w-full bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const hasWikiDocs = wikiRoot.files.length > 0 || wikiRoot.children.length > 0;
  const hasOtherDocs = otherRoot.files.length > 0 || otherRoot.children.length > 0;

  if (!hasWikiDocs && !hasOtherDocs) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No files found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasWikiDocs && (
        <div className="space-y-1">
          {hasOtherDocs && (
            <div className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              Wiki
            </div>
          )}
          {wikiRoot.files.map((file) => (
            <FileEntry
              key={file.path}
              entry={file}
              isActive={activePath === file.path}
              onSelect={() => onSelectPath(file.path)}
              onPrefetch={() => onPrefetchPath?.(file.path)}
            />
          ))}
          {wikiRoot.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              activePath={activePath}
              titleMap={titleMap}
              onSelectPath={onSelectPath}
              onPrefetchPath={onPrefetchPath}
            />
          ))}
        </div>
      )}

      {hasOtherDocs && !hasWikiDocs && (
        <div className="space-y-1">
          {otherRoot.files.map((file) => (
            <FileEntry
              key={file.path}
              entry={file}
              isActive={activePath === file.path}
              onSelect={() => onSelectPath(file.path)}
              onPrefetch={() => onPrefetchPath?.(file.path)}
            />
          ))}
          {otherRoot.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              activePath={activePath}
              titleMap={titleMap}
              onSelectPath={onSelectPath}
              onPrefetchPath={onPrefetchPath}
            />
          ))}
        </div>
      )}

      {hasOtherDocs && hasWikiDocs && (
        <details className="group space-y-1 pt-2">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80 list-none">
            <span>Docs</span>
            <ChevronDown
              aria-hidden="true"
              className="docs-index-caret h-3 w-3 text-muted-foreground/60 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="mt-1 space-y-1">
            {otherRoot.files.map((file) => (
              <FileEntry
                key={file.path}
                entry={file}
                isActive={activePath === file.path}
                onSelect={() => onSelectPath(file.path)}
                onPrefetch={() => onPrefetchPath?.(file.path)}
              />
            ))}
            {otherRoot.children.map((child) => (
              <FolderNode
                key={child.id}
                node={child}
                activePath={activePath}
                titleMap={titleMap}
                onSelectPath={onSelectPath}
                onPrefetchPath={onPrefetchPath}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
