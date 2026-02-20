'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { IconUmansLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Terminal,
  BookOpen,
  MessageSquare,
  Container,
  ArrowRight,
  Zap,
  Users,
  Shield,
  Brain,
} from 'lucide-react';
import { FaDiscord, FaXTwitter, FaLinkedinIn } from 'react-icons/fa6';
import { cn } from '@/lib/utils';

// Product data
const products = [
  {
    id: 'code',
    name: 'Code',
    tag: 'Featured',
    icon: Terminal,
    description:
      'LLM endpoint for Claude Code, OpenCode, Cursor, and more',
    shortDescription: 'Drop-in for Claude Code. Without the limits.',
    cta: 'Get started',
    href: '/offers/code',
    featured: true,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    id: 'wiki',
    name: 'Wiki',
    icon: BookOpen,
    description: 'Auto-generated docs grounded in code',
    shortDescription: 'Documentation that stays up to date.',
    cta: 'Browse docs',
    href: '/offers/wiki',
    featured: false,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'workspace',
    name: 'Workspace',
    icon: MessageSquare,
    description: 'Chat and tasks for software teams',
    shortDescription: 'Turn conversations into shipped code.',
    cta: 'Open Workspace',
    href: '/offers/workspace',
    featured: false,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'envs',
    name: 'Envs',
    icon: Container,
    description: 'Repo-oriented sandboxes for secure, productive agents',
    shortDescription: 'Spin up in seconds. Isolate failures. Stay secure.',
    cta: 'Join waitlist',
    href: '/offers/envs',
    featured: false,
    comingSoon: true,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-hidden">
      {/* Dynamic gradient background */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%,
            rgba(99, 102, 241, 0.25) 0%,
            rgba(147, 51, 234, 0.15) 35%,
            rgba(99, 102, 241, 0) 70%)`,
        }}
      />

      {/* Additional background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-1/2 left-3/4 w-48 h-48 bg-gradient-to-br from-violet-500/12 to-purple-500/12 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        />
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10" />
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-lg border-b border-border/50'
            : 'bg-transparent'
        )}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <IconUmansLogo className="h-8 w-auto" />
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm text-foreground/80">
              <div className="relative group">
                <button className="hover:text-foreground transition-colors flex items-center gap-1">
                  Products
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-2 w-72 py-2 bg-background/95 backdrop-blur-lg border border-border/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link
                    href="/offers/code"
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Code</span>
                    <span className="block text-xs text-muted-foreground whitespace-nowrap">LLM endpoint</span>
                  </Link>
                  <Link
                    href="/offers/wiki"
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Wiki</span>
                    <span className="block text-xs text-muted-foreground whitespace-nowrap">Auto docs</span>
                  </Link>
                  <Link
                    href="/offers/workspace"
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Workspace</span>
                    <span className="block text-xs text-muted-foreground whitespace-nowrap">Chat and tasks</span>
                  </Link>
                  <Link
                    href="/offers/envs"
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Envs</span>
                    <span className="block text-xs text-muted-foreground whitespace-nowrap">Repo sandboxes</span>
                  </Link>
                </div>
              </div>
              <Link
                href="https://blog.umans.ai"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Blog
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center gap-3 text-foreground/60">
                <a
                  href="https://discord.gg/Q5hdNrk7Rw"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors"
                  aria-label="Discord"
                >
                  <FaDiscord className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com/umans_ai"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors"
                  aria-label="X"
                >
                  <FaXTwitter className="h-4 w-4" />
                </a>
                <a
                  href="https://www.linkedin.com/company/umans-ai"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <FaLinkedinIn className="h-4 w-4" />
                </a>
              </div>
              <ThemeToggle variant="ghost" />
              <Button asChild size="sm" className={primaryButtonClasses}>
                <Link href="/go-to-app">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 text-foreground text-balance">
                Your coding agent infrastructure.{' '}
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                  All in one place.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                From LLM endpoints to repo-oriented sandboxes, we build the
                infrastructure that keeps agents productive, secure, and on
                task so humans can focus on what matters.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Product Cards Section */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Featured: Code Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <Link href="/offers/code" className="block h-full group">
                <Card className="h-full transition-all duration-300 hover:shadow-2xl border-primary/30 ring-1 ring-primary/10 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5" />
                  <div className="relative grid md:grid-cols-2 gap-6">
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
                          <Terminal className="w-7 h-7" />
                        </div>
                      </div>
                      <CardTitle className="text-3xl mb-3">Code</CardTitle>
                      <CardDescription className="text-lg mb-4">
                        LLM endpoint for Claude Code, OpenCode, Cursor, and more
                      </CardDescription>
                      <p className="text-xl text-foreground font-medium mb-6">
                        &ldquo;Drop-in for Claude Code. Without the limits.&rdquo;
                      </p>
                      <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                        Get started
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 gap-5">
                      {/* Brain icon */}
                      <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Brain className="w-7 h-7 text-indigo-500" />
                      </div>

                      {/* Tool logos marquee */}
                      <div className="relative overflow-hidden w-full max-w-sm">
                        <div className="flex animate-marquee gap-4">
                          {/* First set */}
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/claude-ai-icon.svg" alt="Claude Code" className="h-5 w-5" />
                            <span className="text-xs font-medium">Claude Code</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/cursor-ai-code-icon.svg" alt="Cursor" className="h-5 w-5" />
                            <span className="text-xs font-medium">Cursor</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/opencode.svg" alt="OpenCode" className="h-5 w-5 rounded bg-white p-0.5" />
                            <span className="text-xs font-medium">OpenCode</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://kilo.ai/favicon/favicon.svg" alt="Kilo Code" className="h-5 w-5" />
                            <span className="text-xs font-medium">Kilo Code</span>
                          </div>
                          {/* Duplicate set for seamless loop */}
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/claude-ai-icon.svg" alt="Claude Code" className="h-5 w-5" />
                            <span className="text-xs font-medium">Claude Code</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/cursor-ai-code-icon.svg" alt="Cursor" className="h-5 w-5" />
                            <span className="text-xs font-medium">Cursor</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/opencode.svg" alt="OpenCode" className="h-5 w-5 rounded bg-white p-0.5" />
                            <span className="text-xs font-medium">OpenCode</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                            <img src="https://kilo.ai/favicon/favicon.svg" alt="Kilo Code" className="h-5 w-5" />
                            <span className="text-xs font-medium">Kilo Code</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        Works with your favorite tools
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>

            {/* Other Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.slice(1).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: (index + 1) * 0.1 }}
                >
                  <Link href={product.href} className="block h-full group">
                    <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              product.bgColor,
                              product.color
                            )}
                          >
                            <product.icon className="w-6 h-6" />
                          </div>
                          {product.comingSoon && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-xl mb-2">
                          {product.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-foreground font-medium text-sm">
                          &ldquo;{product.shortDescription}&rdquo;
                        </p>
                        <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                          {product.cta}
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Proposition Section */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Built for serious agentic work
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Infrastructure that handles the heavy lifting so your team can
                focus on shipping.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Drop-in replacement
                </h3>
                  <p className="text-muted-foreground">
                  Works with Claude Code, OpenCode, Cursor, and any
                  OpenAI/Anthropic-compatible tool.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Humans stay in control
                </h3>
                <p className="text-muted-foreground">
                  Agents handle the repetitive work. Your team focuses on
                  architecture, decisions, and creative problem-solving.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Secure by default
                </h3>
                <p className="text-muted-foreground">
                  Repo-oriented sandboxes isolate failures. Egress controls and
                  audit logs keep you compliant.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of developers using Umans to ship faster with AI
              agents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className={primaryButtonClasses}>
                <Link href="/offers/code">Start with Code</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link href="/offers/workspace">Explore Workspace</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Marquee Animation Styles */}
        <style jsx>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 15s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Footer */}
        <footer className="py-12 border-t border-border/40 bg-muted/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Link href="/" className="flex items-center">
                <IconUmansLogo className="h-6 w-auto" />
              </Link>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Umans AI. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
                <a
                  href="mailto:contact@umans.ai"
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
