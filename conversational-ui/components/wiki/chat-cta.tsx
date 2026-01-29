'use client';

import type { KeyboardEvent } from 'react';
import { ArrowUpIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ChatCtaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  kbId: string | undefined;
  disabled?: boolean;
};

export function ChatCta({
  value,
  onChange,
  onSubmit,
  kbId,
  disabled,
}: ChatCtaProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || !kbId) return;

    try {
      localStorage.setItem('pending_chat_message', JSON.stringify(trimmed));
      localStorage.setItem('knowledge_base_id', JSON.stringify(kbId));
    } catch (error) {
      console.error('Failed to store chat draft:', error);
    }

    // Notify parent component
    onSubmit();

    // Redirect to login with next param to continue the flow after auth
    window.location.href = '/login?next=/continue';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,220px)]">
          <form
            className="pointer-events-auto flex gap-2 lg:col-start-2 lg:col-end-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="relative w-full">
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this codebase..."
                className="min-h-[24px] max-h-[160px] overflow-y-auto resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700"
                disabled={disabled}
              />
              <Button
                type="submit"
                disabled={!value.trim() || disabled || !kbId}
                className="absolute bottom-2 right-2 rounded-full p-1.5 h-fit border dark:border-zinc-600"
                aria-label="Send"
              >
                <ArrowUpIcon size={12} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
