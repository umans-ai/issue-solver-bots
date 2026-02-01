'use client';

import Link from 'next/link';
import { useState, useEffect, FormEvent } from 'react';
import { IconUmansLogo } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { 
  Book, 
  Search, 
  GitBranch, 
  Lock, 
  ArrowRight, 
  Star, 
  Github, 
  Sparkles,
  RefreshCw,
  Link2,
  Workflow,
  Users,
  Lightbulb,
  Zap,
  Plus
} from 'lucide-react';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import { RequestRepoDialog } from './request-repo-dialog';
import useSWR from 'swr';
import type { FeaturedRepo } from '@/lib/db/schema';

// --- Types ---
interface FeaturedRepoDisplay {
  id: string;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number | null;
  lastIndexed: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Helpers ---
function formatStars(stars: number | null): string {
  if (!stars) return '0';
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(0)}k`;
  }
  return String(stars);
}

function formatLastIndexed(date: Date | string | null): string {
  if (!date) return 'recently';
  const indexed = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - indexed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

export default function WikiLandingPage() {
  const { data: reposData, error } = useSWR('/api/public/featured-repos', fetcher);
  const featuredRepos: FeaturedRepoDisplay[] = reposData?.repos?.map((repo: FeaturedRepo) => ({
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    lastIndexed: formatLastIndexed(repo.indexedAt),
  })) || [];
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredRepos = featuredRepos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.owner.toLowerCase().includes(query) ||
      (repo.description?.toLowerCase().includes(query) ?? false) ||
      (repo.language?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 flex flex-col">
      
      {/* --- Navbar --- */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
          isScrolled ? "bg-background/80 backdrop-blur-lg border-border/50" : "bg-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <IconUmansLogo className="h-8 w-auto" />
                <span className="font-medium text-lg tracking-tight">wiki</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center gap-3 text-foreground/80">
                <a href="https://discord.gg/Q5hdNrk7Rw" target="_blank" rel="noreferrer" className="hover:text-foreground">
                  <FaDiscord className="h-4 w-4" />
                </a>
                <a href="https://x.com/umans_ai" target="_blank" rel="noreferrer" className="hover:text-foreground">
                  <FaXTwitter className="h-4 w-4" />
                </a>
              </div>
              <ThemeToggle variant="ghost" />
              <Link href="/login?next=/docs" className={buttonVariants({ variant: "default", size: "sm" })}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-32 lg:pt-40">
        
        {/* --- Hero Section --- */}
        <section className="px-6 text-center max-w-5xl mx-auto mb-24">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 text-foreground text-balance">
            Documentation that <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              stays up to date.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Auto-generated docs grounded in source code. Links back to your files.
            <br className="hidden sm:block" /> Ask questions and share knowledge.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
             <Link href="/register?next=/docs">
                <Button size="lg" className="h-12 px-8 text-base">
                  Try it on your repo
                </Button>
             </Link>
             <Button variant="outline" size="lg" className="h-12 px-8 text-base" onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}>
                Browse featured repos
             </Button>
          </div>
        </section>

        {/* --- Featured Repos Section --- */}
        <section id="featured" className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Featured Repositories</h2>
            </div>

            {/* Search Input */}
            <div className="mb-16 relative max-w-[720px] mx-auto group">
              <div className="absolute inset-0 -inset-x-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <Input 
                  placeholder="Find a public repo" 
                  className="pl-14 h-16 rounded-full bg-background/80 border-border/60 shadow-xl shadow-indigo-500/5 backdrop-blur-xl focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500/50 text-lg placeholder:text-muted-foreground/60 transition-all duration-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-muted-foreground/70 z-10">
                  <Search className="h-6 w-6" />
                </div>
              </div>
            </div>

            {filteredRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRepos.map((repo) => (
                  <Card key={repo.id} className="flex flex-col h-full hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Github className="w-4 h-4" />
                          <span>{repo.owner}</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 bg-muted px-2 py-0.5 rounded">
                          Updated {repo.lastIndexed}
                        </div>
                      </div>
                      <CardTitle className="text-xl">{repo.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {repo.language && (
                          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 ring-1 ring-inset ring-blue-500/20">
                            {repo.language}
                          </span>
                        )}
                        {repo.stars !== null && (
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Star className="w-3 h-3 mr-1" /> {formatStars(repo.stars)}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {repo.description || 'No description available'}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/docs/public/${repo.owner}/${repo.name}`} className="w-full">
                        <Button variant="secondary" className="w-full group">
                          <span>Open Wiki</span>
                          <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 text-center p-6">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <CardTitle>Repo not listed yet</CardTitle>
                    <CardDescription>
                      Send us the URL and we will add it to the public catalog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RequestRepoDialog>
                      <Button className="w-full">Request this repo</Button>
                    </RequestRepoDialog>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* --- Features/Values Section --- */}
        <section className="py-24 px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left Text */}
              <div className="lg:sticky lg:top-32">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-balance">
                  Read the codebase. <br />
                  <span className="text-primary">Skip the archaeology.</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8 text-balance">
                   Auto-generated docs grounded in your repository. Built to stay trustworthy: every page points back to the files it used.
                </p>
              </div>

              {/* Right Grid */}
              <div className="space-y-6">
                 <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50 transition-colors hover:bg-card/80">
                       <CardHeader className="pb-2">
                          <Book className="w-8 h-8 text-indigo-500 mb-2" />
                          <CardTitle className="text-base">Grounded in code</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-muted-foreground">
                          Docs generated from what’s in the repo. No hand-wavy summaries.
                       </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50 transition-colors hover:bg-card/80">
                       <CardHeader className="pb-2">
                          <Search className="w-8 h-8 text-purple-500 mb-2" />
                          <CardTitle className="text-base">Traceable sources</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-muted-foreground">
                          Each page shows the relevant files behind it so you can verify fast.
                       </CardContent>
                    </Card>
                     <Card className="bg-card/50 backdrop-blur-sm border-border/50 transition-colors hover:bg-card/80">
                       <CardHeader className="pb-2">
                          <RefreshCw className="w-8 h-8 text-green-500 mb-2" />
                          <CardTitle className="text-base">Always up-to-date</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-muted-foreground">
                          Regenerate docs automatically when the repo changes. You can also refresh on demand.
                       </CardContent>
                    </Card>
                     <Card className="bg-card/50 backdrop-blur-sm border-border/50 transition-colors hover:bg-card/80">
                       <CardHeader className="pb-2">
                          <Link2 className="w-8 h-8 text-blue-500 mb-2" />
                          <CardTitle className="text-base">Shareable context</CardTitle>
                       </CardHeader>
                       <CardContent className="text-sm text-muted-foreground">
                          A structured doc tree your team can browse, link, and reuse.
                       </CardContent>
                    </Card>
                 </div>

                 <Card className="bg-card/50 backdrop-blur-sm border-border/50 w-full transition-colors hover:bg-card/80">
                    <CardHeader>
                       <div className="flex items-center gap-3 mb-2">
                          <Workflow className="w-8 h-8 text-pink-500" />
                          <CardTitle className="text-lg">Architecture, visualized</CardTitle>
                       </div>
                       <CardDescription>
                          Generate diagrams that summarize data flows and key components from the codebase.
                       </CardDescription>
                    </CardHeader>
                 </Card>
              </div>
            </div>
          </div>
        </section>

        {/* --- Talk to your codebase Section --- */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-3xl font-bold mb-4">Talk to your codebase. Together.</h2>
               <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                  Turn codebase knowledge into something the whole team can use.
                  Ask questions in plain language and get answers grounded in the repo, with links to the exact files behind them.
               </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
               <div className="bg-background/60 backdrop-blur border border-border/50 p-6 rounded-xl">
                  <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center mb-4">
                     <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Align on how the system works</h3>
                  <p className="text-sm text-muted-foreground">Explain flows, boundaries, key concepts, and edge cases without tribal knowledge.</p>
               </div>
               <div className="bg-background/60 backdrop-blur border border-border/50 p-6 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center mb-4">
                     <Lightbulb className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Turn ‘what should we change?’ into a concrete plan</h3>
                  <p className="text-sm text-muted-foreground">Explore impact, dependencies, and likely touchpoints before building.</p>
               </div>
               <div className="bg-background/60 backdrop-blur border border-border/50 p-6 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center mb-4">
                     <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-2">Make onboarding and reviews faster</h3>
                  <p className="text-sm text-muted-foreground">Newcomers get context quickly. Reviewers get a shared reference with sources.</p>
               </div>
            </div>
          </div>
        </section>

        {/* --- Private Repos CTA --- */}
        <section className="py-24 px-6">
           <div className="max-w-3xl mx-auto bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-8 sm:p-12 text-center">
                 <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 mb-6">
                    <Lock className="w-6 h-6" />
                 </div>
                 <h2 className="text-3xl font-bold mb-4">Private repositories?</h2>
                 <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                    Connect a private git repository and get a private, team-only docs space in minutes. 
                    No code leaves your control.
                 </p>
                 <Link href="/register?next=/docs">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                       Sign up to connect a repo
                    </Button>
                 </Link>
           </div>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="py-12 border-t border-border/40 text-center text-sm text-muted-foreground bg-muted/20">
         <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Umans AI. All rights reserved.</p>
            <div className="flex gap-6">
               <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
               <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
         </div>
      </footer>
    </div>
  );
}
