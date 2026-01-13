'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface RequestRepoDialogProps {
  children: React.ReactNode;
}

export function RequestRepoDialog({ children }: RequestRepoDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ repoUrl: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waitlist_id: 'wiki_request',
          email: formData.email || 'anonymous@example.com',
          repo_link: formData.repoUrl,
          page_path: window.location.pathname,
        }),
      });

      if (!res.ok) {
        throw new Error('API failed');
      }
      
      setStep('success');
    } catch (error) {
      const subject = encodeURIComponent('Umans Wiki repo request');
      const body = encodeURIComponent(`I'd like to request a wiki for:\n${formData.repoUrl}\n\nMy email: ${formData.email}`);
      window.location.href = `mailto:contact@umans.ai?subject=${subject}&body=${body}`;
      setStep('success');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStep('form');
        setFormData({ repoUrl: '', email: '' });
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a repository</DialogTitle>
          <DialogDescription>
            Paste a public git repository URL.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://git.example.com/org/repo"
                required
                value={formData.repoUrl}
                onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                We'll notify you when it's ready.
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send request
              </Button>
            </div>
          </form>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">Request sent</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Thanks! We've added this repository to our queue.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}