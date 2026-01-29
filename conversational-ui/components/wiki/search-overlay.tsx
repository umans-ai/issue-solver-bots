'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { SearchIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';

export type SearchResult = {
  key: string;
  path: string;
  title: string;
  snippet?: string;
  occurrence?: number;
};

type SearchOverlayProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  results: SearchResult[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onSelectResult: (result: SearchResult) => void;
  isSearching: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  resultsContainerRef: RefObject<HTMLDivElement | null>;
  hasFiles: boolean;
  isLoading: boolean;
};

export function SearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onClose,
  results,
  selectedIndex,
  onSelectIndex,
  onSelectResult,
  isSearching,
  inputRef,
  resultsContainerRef,
  hasFiles,
  isLoading,
}: SearchOverlayProps) {
  if (!isOpen) return null;

  const hasQuery = query.trim().length >= 3;
  const displayedItems = results;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = displayedItems[Math.min(selectedIndex, Math.max(0, displayedItems.length - 1))];
      if (target) {
        onSelectResult(target);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(selectedIndex + 1, Math.max(0, displayedItems.length - 1));
      onSelectIndex(nextIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(selectedIndex - 1, 0);
      onSelectIndex(nextIndex);
    }
  };

  return (
    <div
      className="docs-search-overlay fixed inset-0 z-50 flex items-start justify-center bg-black/10 backdrop-blur-3xl backdrop-saturate-150 px-4 pt-20 dark:bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3">
          <SearchIcon size={18} className="text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            placeholder="Search docs..."
            onChange={(e) => {
              onQueryChange(e.target.value);
              onSelectIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-11 border-0 bg-transparent px-0 text-base focus-visible:ring-0"
            autoFocus
          />
          <span className="hidden items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground/80 sm:inline-flex">
            Esc
          </span>
        </div>
        <div className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
          {hasQuery ? 'Results' : 'Suggested'}
        </div>
        <div
          ref={resultsContainerRef}
          className="max-h-[320px] overflow-y-auto py-2"
        >
          {isSearching ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : displayedItems.length > 0 ? (
            displayedItems.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectResult(item)}
                onMouseEnter={() => onSelectIndex(index)}
                data-result-index={index}
                className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                  index === selectedIndex
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                {item.snippet && (
                  <span className="text-xs text-muted-foreground/80 truncate">
                    {item.snippet}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {hasQuery
                ? 'No matches found.'
                : query.trim().length > 0
                  ? 'Type at least 3 characters to search.'
                  : isLoading
                    ? 'Loading docs...'
                    : !hasFiles
                      ? 'No documents available yet.'
                      : 'Start typing to search docs.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
