'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconUmansLogo } from '@/components/icons';
import { Check, Copy, Loader2, Lock, AlertCircle, Terminal, ArrowRight } from 'lucide-react';

interface SetupCliClientProps {
  token: string | null;
  callbackUrl: string | null;
  error: string | null;
  showSubscribeButton?: boolean;
}

export function SetupCliClient({ token, callbackUrl, error, showSubscribeButton }: SetupCliClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(true);

  // Auto-redirect when token is available
  useEffect(() => {
    if (token && callbackUrl && isRedirecting) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Attempt redirect
            window.location.href = callbackUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [token, callbackUrl, isRedirecting]);

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualRedirect = () => {
    if (callbackUrl) {
      window.location.href = callbackUrl;
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0b0d10] flex flex-col">
        {/* Branding topbar */}
        <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-6">
            <Link
              href="/offers/code"
              className="flex items-center gap-2 text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
            >
              <IconUmansLogo className="h-5 w-auto" />
              <span className="text-sm font-medium tracking-tight">code</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-black/10 dark:border-white/10 bg-white dark:bg-[#0b0d10] shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-[#0b0d10] dark:text-white">
                  Authentication Failed
                </CardTitle>
                <CardDescription className="text-base mt-2 text-[#0b0d10]/60 dark:text-white/60">
                  {error}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showSubscribeButton && (
                <Button
                  className="w-full rounded-full bg-[#0b0d10] dark:bg-white text-white dark:text-[#0b0d10] hover:bg-[#0b0d10]/90 dark:hover:bg-white/90"
                  onClick={() => router.push('/billing/start')}
                >
                  Subscribe Now
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full rounded-full border-black/20 dark:border-white/20 bg-transparent text-[#0b0d10] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#0b0d10] dark:hover:text-white"
                onClick={() => router.push('/login')}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state with auto-redirect
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0d10] flex flex-col">
      {/* Branding topbar */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-6">
          <Link
            href="/offers/code"
            className="flex items-center gap-2 text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
          >
            <IconUmansLogo className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-tight">code</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-black/10 dark:border-white/10 bg-white dark:bg-[#0b0d10] shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
              <Terminal className="h-10 w-10 text-[#0b0d10] dark:text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-[#0b0d10] dark:text-white">
                Authentication Successful!
              </CardTitle>
              <CardDescription className="text-base mt-2 text-[#0b0d10]/60 dark:text-white/60">
                Your CLI is ready to connect to Claude Code.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Auto-redirect status */}
            {isRedirecting ? (
              <div className="flex items-center justify-center gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-[#0b0d10]/70 dark:text-white/70" />
                <span className="text-sm text-[#0b0d10]/60 dark:text-white/60">
                  Redirecting to CLI in {countdown} second{countdown !== 1 ? 's' : ''}...
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-[#0b0d10]/70 dark:text-white/70">
                  Redirect cancelled. Copy the token manually.
                </span>
              </div>
            )}

            {/* Token display with copy button inside */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-[#0b0d10]/80 dark:text-white/80">
                <Lock className="h-4 w-4" />
                <span>Your API Token</span>
              </div>
              <div className="relative">
                <code className="flex w-full items-center justify-between gap-2 p-3 pr-12 bg-black/5 dark:bg-white/5 rounded-lg text-sm font-mono text-[#0b0d10]/90 dark:text-white/90 border border-black/10 dark:border-white/10">
                  <span className="truncate">{token}</span>
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-white/50 dark:bg-black/50 text-[#0b0d10] dark:text-white hover:bg-white dark:hover:bg-black"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#0b0d10]/50 dark:text-white/50">
                This token will only be shown once. Store it securely.
              </p>
            </div>

            {/* Manual actions */}
            <div className="space-y-2">
              {isRedirecting && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-[#0b0d10]/60 dark:text-white/60 hover:text-[#0b0d10] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setIsRedirecting(false)}
                >
                  Cancel auto-redirect
                </Button>
              )}

              {!isRedirecting && callbackUrl && (
                <Button
                  className="w-full rounded-full bg-[#0b0d10] dark:bg-white text-white dark:text-[#0b0d10] hover:bg-[#0b0d10]/90 dark:hover:bg-white/90"
                  onClick={handleManualRedirect}
                >
                  <span>Continue to CLI</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Security note */}
            <div className="pt-4 border-t border-black/10 dark:border-white/10">
              <p className="text-xs text-center text-[#0b0d10]/40 dark:text-white/40">
                This connection is secure. The token is sent directly to your local CLI.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
