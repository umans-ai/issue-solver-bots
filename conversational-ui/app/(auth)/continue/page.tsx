'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconUmansLogo } from '@/components/icons';
import { useSession } from 'next-auth/react';

/**
 * Continue Page - Post-Auth Handler for Public Wiki Chat Conversion
 *
 * This page handles the conversion flow when a public wiki visitor
 * submits a chat message and needs to authenticate first.
 *
 * Flow:
 * 1. User submits message on public wiki -> stores message + KB ID in localStorage
 * 2. User is redirected to /login?next=/continue
 * 3. After successful auth, user lands here
 * 4. This page:
 *    - Reads the pending message and KB ID from localStorage
 *    - Calls /api/spaces/join-or-create to find/create space with this KB
 *    - Refreshes the session to get updated selectedSpace
 *    - Redirects to / (home) where the pending message is auto-sent
 */

export default function ContinuePage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Setting up your workspace...');

  useEffect(() => {
    async function setupSpaceAndRedirect() {
      try {
        // Read pending data from localStorage
        const rawKbId = localStorage.getItem('knowledge_base_id');
        const rawMessage = localStorage.getItem('pending_chat_message');

        if (!rawKbId) {
          // No pending chat - just redirect to home
          router.replace('/');
          return;
        }

        // Parse KB ID (handles both JSON and raw string)
        let knowledgeBaseId: string;
        try {
          knowledgeBaseId = JSON.parse(rawKbId);
        } catch {
          knowledgeBaseId = rawKbId;
        }

        // Parse message if present
        let pendingMessage: string | null = null;
        if (rawMessage) {
          try {
            pendingMessage = JSON.parse(rawMessage);
          } catch {
            pendingMessage = rawMessage;
          }
        }

        // Call API to create/join space
        const response = await fetch('/api/spaces/join-or-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledgeBaseId,
            pendingMessage: pendingMessage || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to set up workspace');
        }

        // Successfully set up space - refresh session to get updated selectedSpace
        // then redirect to home
        await updateSession();
        router.replace('/');
      } catch (error) {
        console.error('Error in continue flow:', error);
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
        );
      }
    }

    setupSpaceAndRedirect();
  }, [router, updateSession]);

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <IconUmansLogo className="h-16 w-auto" />
          {status === 'loading' ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <h3 className="text-lg font-medium">Setting up your workspace</h3>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-red-600">
                Could not set up workspace
              </h3>
              <p className="text-sm text-gray-500">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Back to Sign In
              </button>
            </>
          )}
          <p className="text-sm text-gray-500 dark:text-zinc-400">{message}</p>
        </div>
      </div>
    </div>
  );
}
