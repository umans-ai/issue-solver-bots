'use client';

import { useCallback } from 'react';
import { BookOpen, Plug } from 'lucide-react';

import { SharedHeader } from '@/components/shared-header';
import { Button } from '@/components/ui/button';

export function DocsEmptyState() {
  const handleConnectRepo = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('open-repo-dialog'));
  }, []);

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <SharedHeader>
        <div className="flex flex-1 items-center gap-3 px-2 md:px-4">
          <span className="text-lg lg:text-xl font-semibold text-foreground truncate">
            Wiki &amp; Docs
          </span>
        </div>
      </SharedHeader>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 lg:px-6">
          <div className="flex justify-center">
            <div className="flex flex-col items-center text-center gap-3 border border-dashed border-muted rounded-2xl px-6 py-6 w-full max-w-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Bring a repo to life
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Get a living wiki, design-grade code chat, and agent-powered
                  execution.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleConnectRepo}
              >
                <Plug className="h-4 w-4" />
                Connect repository
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
