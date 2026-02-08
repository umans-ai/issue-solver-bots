'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconUmansLogo } from '@/components/icons';
import { Check, Copy, Loader2, Lock, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Authentication Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSubscribeButton && (
              <Button
                className="w-full"
                onClick={() => router.push('/billing/start')}
              >
                Subscribe Now
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state with auto-redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/20 dark:via-background dark:to-purple-950/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Authentication Successful!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your CLI is ready to connect to Claude Code.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Auto-redirect status */}
          {isRedirecting ? (
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <span className="text-sm text-muted-foreground">
                Redirecting to CLI in {countdown} second{countdown !== 1 ? 's' : ''}...
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Redirect cancelled. Copy the token manually.
              </span>
            </div>
          )}

          {/* Token display with copy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" />
              <span>Your API Token</span>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg text-xs break-all font-mono border">
                {token}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This token will only be shown once. Store it securely.
            </p>
          </div>

          {/* Manual actions */}
          <div className="space-y-2">
            {isRedirecting && (
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setIsRedirecting(false)}
              >
                Cancel auto-redirect
              </Button>
            )}

            {!isRedirecting && callbackUrl && (
              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                onClick={handleManualRedirect}
              >
                <span>Continue to CLI</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Security note */}
          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              This connection is secure. The token is sent directly to your local CLI.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
