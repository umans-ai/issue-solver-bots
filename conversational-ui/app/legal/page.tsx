'use client';

import Link from 'next/link';
import { IconUmansLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, BookOpen, MessageSquare, Container, FileText, Shield } from 'lucide-react';

const products = [
  {
    id: 'code',
    name: 'Code',
    icon: Terminal,
    description: 'LLM endpoint service',
    termsHref: '/offers/code/legal/terms-of-use',
    privacyHref: '/offers/code/legal/privacy-policy',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    id: 'workspace',
    name: 'Workspace',
    icon: MessageSquare,
    description: 'Chat and tasks platform',
    termsHref: '/terms',
    privacyHref: '/privacy',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'wiki',
    name: 'Wiki',
    icon: BookOpen,
    description: 'Auto-generated docs',
    termsHref: '/terms',
    privacyHref: '/privacy',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'envs',
    name: 'Envs',
    icon: Container,
    description: 'Repo sandboxes (coming soon)',
    termsHref: '/terms',
    privacyHref: '/privacy',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <IconUmansLogo className="h-8 w-auto" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Legal Information</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Unified Account Explanation */}
        <section className="mb-12">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-muted/50 border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">One account, multiple products</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you sign up for Umans, you create a single account that works across all our products:
                Code, Wiki, Workspace, and Envs. Your email and password are the same everywhere.
              </p>
            </div>
          </div>
        </section>

        {/* Separate Plans & Terms */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Separate plans and legal terms</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            While you use one account to access all products, each product has its own pricing,
            subscription plans, and legal terms. When you subscribe to a product, you agree to
            that product specific terms.
          </p>

          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id} className="bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${product.bgColor} ${product.color}`}>
                      <product.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>{product.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Link
                      href={product.termsHref}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      target="_blank"
                    >
                      <FileText className="w-4 h-4" />
                      Terms of Use
                    </Link>
                    <Link
                      href={product.privacyHref}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      target="_blank"
                    >
                      <Shield className="w-4 h-4" />
                      Privacy Policy
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section className="p-6 rounded-xl bg-muted/30 border border-border/50">
          <h2 className="font-semibold text-lg mb-3">Quick summary</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>One account works across all Umans products</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Each product has its own pricing and subscription</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Each product has its own legal terms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Subscribing to one product does not subscribe you to others</span>
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Have questions?{' '}
            <Link href="mailto:contact@umans.ai" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
