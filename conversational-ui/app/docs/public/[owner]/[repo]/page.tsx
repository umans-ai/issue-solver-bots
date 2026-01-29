'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { ChevronDown, Github } from 'lucide-react';
import { DocsMarkdown } from '@/components/docs-markdown';
import { Button } from '@/components/ui/button';
import { SearchIcon, IconUmansLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { DocTree, type DocFolderNode } from '@/components/wiki/doc-tree';
import { VersionSelector } from '@/components/wiki/version-selector';
import { SearchOverlay, type SearchResult } from '@/components/wiki/search-overlay';
import { TocSidebar } from '@/components/wiki/toc-sidebar';
import { ChatCta } from '@/components/wiki/chat-cta';
import type { WikiPageManifest } from '@/lib/docs/wiki-store';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';

// Types
interface RepoInfo {
  owner: string;
  name: string;
  kbId: string;
  commitSha: string;
  repoUrl: string;
  description?: string;
  language?: string;
  stars?: number;
  indexedAt?: string;
  currentVersion: string;
  versions: string[];
}

interface FileListResponse {
  owner: string;
  name: string;
  commitSha: string;
  files: string[];
  metadata: Record<string, { origin?: string; process_id?: string }>;
  titles: Record<string, string>;
  manifest: WikiPageManifest | null;
}

interface FileContentResponse {
  content: string;
  title: string | null;
}

// Fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch: ${res.status}`);
  }
  return res.json();
};

// Utility functions
const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const formatSegment = (segment: string) =>
  segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

// User menu component for authenticated users
function UserMenu({ user }: { user: User }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border p-1 pr-3 hover:bg-accent transition-colors"
        >
          <Avatar
            user={{
              image: user.image,
              name: user.name,
              email: user.email,
            }}
            size={28}
          />
          <span className="text-sm hidden sm:inline">{user.name || user.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium truncate">
          {user.name || user.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" className="cursor-pointer">Go to app</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onSelect={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Build document trees from file list
function buildDocTrees(
  files: string[],
  titleMap: Record<string, string>,
  metadata: Record<string, { origin?: string; process_id?: string }>,
  manifest: WikiPageManifest | null,
): { wiki: DocFolderNode; other: DocFolderNode } {
  const wikiPaths = new Set<string>();
  if (manifest) {
    const entries = Array.isArray(manifest.wiki)
      ? manifest.wiki
      : Array.isArray(manifest.pages)
        ? manifest.pages
        : [];
    for (const entry of entries) {
      if (typeof entry?.path === 'string') {
        const normalized = entry.path.toLowerCase().endsWith('.md')
          ? entry.path
          : `${entry.path}.md`;
        wikiPaths.add(normalized);
      }
    }
  }

  const orderMap = new Map(files.map((entry, index) => [entry, index]));
  const orderIndexFor = (path: string) =>
    orderMap.get(path) ?? Number.POSITIVE_INFINITY;

  const createRoot = (): DocFolderNode => ({
    id: '',
    name: '',
    label: '',
    children: [],
    files: [],
  });

  const wikiRoot = createRoot();
  const otherRoot = createRoot();

  const ensureChild = (parent: DocFolderNode, segment: string): DocFolderNode => {
    let child = parent.children.find((node) => node.name === segment);
    if (!child) {
      const id = parent.id ? `${parent.id}/${segment}` : segment;
      child = {
        id,
        name: segment,
        label: formatSegment(segment),
        children: [],
        files: [],
      };
      parent.children.push(child);
    }
    return child;
  };

  const hasWikiEntries = wikiPaths.size > 0;

  for (const path of files) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    const isWikiDoc = hasWikiEntries && wikiPaths.has(path);
    const targetRoot = isWikiDoc ? wikiRoot : otherRoot;

    let cursor = targetRoot;
    parts.forEach((segment, index) => {
      const isFile = index === parts.length - 1;
      if (isFile) {
        cursor.files.push({
          path,
          title: titleMap[path] || segment,
          origin: metadata[path]?.origin,
        });
        return;
      }
      cursor = ensureChild(cursor, segment);
    });
  }

  const assignOrderIndex = (node: DocFolderNode): number => {
    let minOrder = Number.POSITIVE_INFINITY;
    node.files.forEach((file) => {
      const orderIndex = orderIndexFor(file.path);
      if (orderIndex < minOrder) minOrder = orderIndex;
    });
    node.children.forEach((child) => {
      const childMin = assignOrderIndex(child);
      if (childMin < minOrder) minOrder = childMin;
    });
    node.orderIndex = minOrder;
    return minOrder;
  };

  const sortNode = (node: DocFolderNode) => {
    node.children.sort((a, b) => {
      const aOrder = a.orderIndex ?? Number.POSITIVE_INFINITY;
      const bOrder = b.orderIndex ?? Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.label.localeCompare(b.label, undefined, {
        sensitivity: 'base',
      });
    });
    node.children.forEach(sortNode);
    node.files.sort((a, b) => {
      const aOrder = orderIndexFor(a.path);
      const bOrder = orderIndexFor(b.path);
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aName = a.path.split('/').pop() ?? a.path;
      const bName = b.path.split('/').pop() ?? b.path;
      const aIsIndex = aName.toLowerCase() === 'index.md';
      const bIsIndex = bName.toLowerCase() === 'index.md';
      if (aIsIndex !== bIsIndex) {
        return aIsIndex ? -1 : 1;
      }
      return a.title.localeCompare(b.title, undefined, {
        sensitivity: 'base',
      });
    });
  };

  assignOrderIndex(wikiRoot);
  sortNode(wikiRoot);
  assignOrderIndex(otherRoot);
  sortNode(otherRoot);

  return { wiki: wikiRoot, other: otherRoot };
}

export default function PublicDocsPage() {
  const router = useRouter();
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();

  const owner = typeof params?.owner === 'string' ? params.owner : '';
  const repo = typeof params?.repo === 'string' ? params.repo : '';
  const versionParam = searchParams?.get('v')?.trim() ?? null;

  // Local state
  const [commitSha, setCommitSha] = useState<string | undefined>(undefined);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentStatus, setContentStatus] = useState<
    'idle' | 'loading' | 'ready' | 'missing'
  >('idle');
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
    [],
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [, startTransition] = useTransition();
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Auth session
  const { data: session } = useSession();
  const user = session?.user;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch repo info
  const {
    data: repoInfo,
    error: repoError,
    isLoading: isRepoLoading,
  } = useSWR<RepoInfo>(
    owner && repo ? `/api/public/docs/${owner}/${repo}` : null,
    fetcher,
  );

  // Fetch file list
  const {
    data: fileListData,
    error: fileListError,
    isLoading: isFileListLoading,
  } = useSWR<FileListResponse>(
    owner && repo && commitSha
      ? `/api/public/docs/${owner}/${repo}/list?v=${encodeURIComponent(commitSha)}`
      : null,
    fetcher,
  );

  // Set initial commit SHA from repo info
  useEffect(() => {
    if (repoInfo) {
      const normalizedVersionParam = versionParam?.toLowerCase();
      const matchedFromQuery = normalizedVersionParam
        ? repoInfo.versions.find((sha: string) =>
            sha.toLowerCase().startsWith(normalizedVersionParam),
          )
        : undefined;
      setCommitSha((prev) => {
        if (matchedFromQuery) return matchedFromQuery;
        if (prev && repoInfo.versions.includes(prev)) return prev;
        return repoInfo.currentVersion;
      });
    }
  }, [repoInfo, versionParam]);

  // Handle path from URL - read from query param set by catch-all redirect
  useEffect(() => {
    const pathParam = searchParams?.get('path')?.trim();
    if (pathParam) {
      setActivePath(pathParam);
    }
    // Note: we don't clear activePath here when pathParam is missing
    // The auto-select effect below handles the initial selection
  }, [searchParams]);

  // Build doc trees
  const docTrees = useMemo(() => {
    if (!fileListData) {
      return { wiki: { id: '', name: '', label: '', children: [], files: [] }, other: { id: '', name: '', label: '', children: [], files: [] } };
    }
    return buildDocTrees(
      fileListData.files,
      fileListData.titles,
      fileListData.metadata,
      fileListData.manifest,
    );
  }, [fileListData]);

  // Fetch content when active path changes
  useEffect(() => {
    if (!owner || !repo || !commitSha || !activePath) {
      setContent('');
      setContentStatus('idle');
      return;
    }

    setContentStatus('loading');
    let cancelled = false;

    fetch(
      `/api/public/docs/${owner}/${repo}/file?v=${encodeURIComponent(commitSha)}&path=${encodeURIComponent(activePath)}`,
      { cache: 'no-store' },
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: FileContentResponse) => {
        if (cancelled) return;
        setContent(data.content);
        setContentStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setContent('');
        setContentStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, commitSha, activePath]);

  // Build TOC from content - polls until headings are found or max timeout
  useEffect(() => {
    // Reset TOC when content changes
    setToc([]);

    if (!content) return;

    // Use polling to handle async rendering by Streamdown and React ref attachment
    // Check every 100ms until headings are found or max 3 seconds
    let attempts = 0;
    const maxAttempts = 30; // 30 * 100ms = 3 seconds

    const checkForHeadings = () => {
      attempts++;

      const container = contentRef.current;
      if (!container) {
        if (attempts < maxAttempts) {
          setTimeout(checkForHeadings, 100);
        }
        return false;
      }

      // Look for headings in the container or any prose content within it
      const proseContainer = container.querySelector('.prose');
      const searchRoot = proseContainer || container;

      const headingElements = Array.from(
        searchRoot.querySelectorAll<HTMLElement>('h1, h2, h3'),
      );

      if (headingElements.length === 0) {
        if (attempts < maxAttempts) {
          setTimeout(checkForHeadings, 100);
        }
        return false;
      }

      const slugCounts = new Map<string, number>();
      const headings = headingElements
        .map((el) => {
          const text = el.textContent?.trim() ?? '';
          if (!text) return null;

          const base = slugify(text);
          if (!base) return null;

          const existing = slugCounts.get(base) ?? 0;
          slugCounts.set(base, existing + 1);
          const id = existing === 0 ? base : `${base}-${existing + 1}`;
          el.id = id;
          el.tabIndex = -1;

          return {
            id,
            text,
            level: Number(el.tagName.replace('H', '')),
          };
        })
        .filter(
          (item): item is { id: string; text: string; level: number } => !!item,
        );

      setToc(headings);
      return true;
    };

    // Start polling after a short initial delay to let rendering begin
    const initialTimeout = setTimeout(checkForHeadings, 50);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [content]);

  // Handle search
  const doSearch = useCallback(async () => {
    if (!owner || !repo || !commitSha || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/public/docs/${owner}/${repo}/search?v=${encodeURIComponent(commitSha)}&q=${encodeURIComponent(searchQuery)}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      const results: SearchResult[] = (data.results || []).map(
        (r: {
          path: string;
          snippet: string;
          line?: number;
          occurrence?: number;
          offset?: number;
        }) => ({
          key: `${r.path}-${r.offset ?? r.occurrence ?? r.line ?? 0}`,
          path: r.path,
          title: fileListData?.titles?.[r.path] || r.path,
          snippet: r.snippet || r.path,
          occurrence: r.occurrence,
        }),
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [owner, repo, commitSha, searchQuery, fileListData?.titles]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const id = setTimeout(() => {
      doSearch();
    }, 250);
    return () => clearTimeout(id);
  }, [searchQuery, doSearch]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 80);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSearchOpen]);

  // Navigation handlers
  const navigateToPath = useCallback(
    (path: string | null, options?: { replace?: boolean }) => {
      startTransition(() => {
        setActivePath(path);
        const encodedOwner = encodeURIComponent(owner);
        const encodedRepo = encodeURIComponent(repo);
        const basePath = `/docs/public/${encodedOwner}/${encodedRepo}`;
        // Use query parameter format to avoid triggering catch-all redirect
        const pathParam = path ? `?path=${encodeURIComponent(path)}` : '';
        const url = commitSha
          ? `${basePath}${pathParam}${pathParam ? '&' : '?'}v=${encodeURIComponent(commitSha.slice(0, 7))}`
          : `${basePath}${pathParam}`;
        if (options?.replace) {
          router.replace(url, { scroll: false });
        } else {
          router.push(url, { scroll: false });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    [owner, repo, commitSha, router],
  );

  // Auto-select first document when no path specified and files are loaded
  useEffect(() => {
    if (hasAutoSelected) return;
    if (!fileListData?.files?.length) return;
    if (searchParams?.get('path')) return;
    if (activePath) return;

    setHasAutoSelected(true);
    const firstFile = fileListData.files[0];
    navigateToPath(firstFile);
  }, [fileListData, activePath, searchParams, hasAutoSelected, navigateToPath]);

  const handleTocNavigate = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const isFocusable = 'focus' in el;
      if (isFocusable) {
        (el as HTMLElement).focus({ preventScroll: true });
      }
      if (typeof window !== 'undefined') {
        const encodedOwner = encodeURIComponent(owner);
        const encodedRepo = encodeURIComponent(repo);
        const basePath = `/docs/public/${encodedOwner}/${encodedRepo}`;
        // Use query parameter format to avoid triggering catch-all redirect
        const pathParam = activePath ? `?path=${encodeURIComponent(activePath)}` : '';
        const versionToken = commitSha
          ? `${pathParam ? '&' : '?'}v=${encodeURIComponent(commitSha.slice(0, 7))}`
          : '';
        window.history.replaceState(
          null,
          '',
          `${basePath}${pathParam}${versionToken}#${id}`,
        );
      }
    },
    [activePath, commitSha, owner, repo],
  );

  // Handle markdown link clicks
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a');
      if (!anchor) return;

      const container = contentRef.current;
      if (!container || !container.contains(anchor)) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const anchorElement = anchor as HTMLAnchorElement;
      const anchorHash =
        anchorElement.hash || (href.startsWith('#') ? href : null);
      if (
        anchorHash &&
        typeof window !== 'undefined' &&
        (!anchorElement.origin ||
          anchorElement.origin === window.location.origin)
      ) {
        const targetId = (() => {
          const raw = anchorHash.replace(/^#/, '');
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        })();

        if (targetId) {
          const targetElement = document.getElementById(targetId);
          if (targetElement && contentRef.current?.contains(targetElement)) {
            event.preventDefault();
            handleTocNavigate(targetId);
            return;
          }
        }
      }

      if (href.startsWith('http') || href.startsWith('mailto:')) return;
      if (href.startsWith('#')) return;

      // Internal navigation
      event.preventDefault();
      const files = fileListData?.files || [];
      const resolvedPath = href.startsWith('/')
        ? href.slice(1)
        : activePath?.includes('/')
          ? `${activePath.substring(0, activePath.lastIndexOf('/'))}/${href.replace(/^\.\//, '')}`
          : href.replace(/^\.\//, '');

      if (files.includes(resolvedPath)) {
        navigateToPath(resolvedPath);
      } else {
        // Try as external link
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [activePath, fileListData?.files, handleTocNavigate, navigateToPath]);

  // Handle hash on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [content]);

  // Loading and error states
  if (repoError) {
    return (
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-background">
          <Link href="/landing" className="flex items-center gap-2">
            <IconUmansLogo className="h-7 w-auto" />
            <span className="font-medium text-lg tracking-tight">wiki</span>
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href={`/login?next=${encodeURIComponent(`/docs/public/${owner}/${repo}`)}`}>
                Sign in
              </Link>
            </Button>
          )}
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Repository not found</h1>
            <p className="text-muted-foreground mb-4">
              The requested repository could not be found or is not publicly available.
            </p>
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isLoading = isRepoLoading || isFileListLoading;
  const showContent = contentStatus === 'ready' || (contentStatus === 'loading' && !!content);
  const showChatCta = showContent && !!activePath;

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-background">
        {/* Left: Logo + Repo name */}
        <div className="flex items-center gap-4">
          {/* umans.ai logo + wiki */}
          <Link href="/landing" className="flex items-center gap-2">
            <IconUmansLogo className="h-7 w-auto" />
            <span className="font-medium text-lg tracking-tight">wiki</span>
          </Link>

          {/* Repo name */}
          {repoInfo && (
            <a
              href={repoInfo.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">{repoInfo.owner}/{repoInfo.name}</span>
              <span className="sm:hidden">{repoInfo.name}</span>
            </a>
          )}
        </div>

        {/* Center: Search */}
        <div className="flex-1 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-3 w-full max-w-md rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground shadow-sm transition hover:bg-muted"
          >
            <SearchIcon size={16} className="text-muted-foreground" />
            <span className="flex-1 truncate text-left">Search docs</span>
            <span className="text-xs font-medium text-muted-foreground/80">
              ⌘K
            </span>
          </button>
        </div>

        {/* Right: Version, Theme, Sign in */}
        <div className="flex items-center gap-2">
          {repoInfo && (
            <VersionSelector
              versions={repoInfo.versions}
              currentVersion={commitSha}
              onVersionChange={setCommitSha}
              disabled={isLoading}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSearchOpen(true)}
          >
            <SearchIcon size={16} />
          </Button>
          {/* Theme toggle */}
          <ThemeToggle variant="outline" />

          {/* Auth: Sign in button or user avatar */}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href={`/login?next=${encodeURIComponent(`/docs/public/${owner}/${repo}`)}`}>
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,220px)] lg:items-start">
              <aside className="hidden lg:block">
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((key) => (
                    <Skeleton key={key} className="h-4 w-full" />
                  ))}
                </div>
              </aside>
              <main className="min-w-0">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </main>
              <aside className="hidden lg:block">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </aside>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,220px)] lg:items-start">
              {/* Mobile TOC */}
              <details className="group rounded-lg border border-border/70 bg-background/70 lg:hidden">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-semibold text-foreground list-none">
                  <span>Contents</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="docs-index-caret h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-1 pb-2 pt-4">
                  <DocTree
                    wikiRoot={docTrees.wiki}
                    otherRoot={docTrees.other}
                    activePath={activePath}
                    titleMap={fileListData?.titles || {}}
                    onSelectPath={navigateToPath}
                    isLoading={isFileListLoading}
                  />
                </div>
              </details>

              {/* Desktop sidebar */}
              <aside className="hidden lg:block lg:sticky lg:top-24 h-fit text-sm">
                <div className="docs-index max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 pt-4">
                  <DocTree
                    wikiRoot={docTrees.wiki}
                    otherRoot={docTrees.other}
                    activePath={activePath}
                    titleMap={fileListData?.titles || {}}
                    onSelectPath={navigateToPath}
                    isLoading={isFileListLoading}
                  />
                </div>
              </aside>

              {/* Main content area */}
              <main className="min-w-0 relative">
                <div
                  className={`mx-auto max-w-7xl px-2 sm:px-4 pt-4 ${showChatCta ? 'pb-24' : ''}`}
                  ref={contentRef}
                >
                  {contentStatus === 'missing' ? (
                    <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                      We couldn&apos;t find this document in the selected version.
                      Try another version or pick a different doc.
                    </div>
                  ) : showContent ? (
                    <div className="max-w-none prose prose-neutral dark:prose-invert docs-prose">
                      <DocsMarkdown>{content}</DocsMarkdown>
                    </div>
                  ) : activePath ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Select a document from the index.
                    </div>
                  )}
                </div>
              </main>

              {/* TOC sidebar */}
              <aside className="hidden lg:block lg:sticky lg:top-24 h-fit text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  On this page
                </div>
                <TocSidebar
                  items={toc}
                  onNavigate={handleTocNavigate}
                  isLoading={contentStatus === 'loading'}
                />
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* Chat CTA */}
      {showChatCta && repoInfo && (
        <ChatCta
          value={chatDraft}
          onChange={setChatDraft}
          onSubmit={() => {
            setChatDraft('');
          }}
          kbId={repoInfo.kbId}
        />
      )}

      {/* Search overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        results={searchResults}
        selectedIndex={selectedSearchIndex}
        onSelectIndex={setSelectedSearchIndex}
        onSelectResult={(result) => {
          navigateToPath(result.path);
          setIsSearchOpen(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        isSearching={isSearching}
        inputRef={searchInputRef}
        resultsContainerRef={resultsContainerRef}
        hasFiles={!!fileListData?.files?.length}
        isLoading={isFileListLoading}
      />

      {/* Styles */}
      <style>{`
        .doc-flash { animation: docFlash 1.2s ease-in-out 1; background-color: rgba(250, 229, 150, 0.9); }
        @keyframes docFlash { 0% { background-color: rgba(250,229,150,0.9); } 100% { background-color: transparent; } }
        .docs-index details summary { list-style: none; border: none; outline: none; border-radius: 0; background: transparent; }
        .docs-index details summary:focus-visible,
        .docs-index details summary:focus { outline: none !important; border: none !important; box-shadow: none !important; background: transparent; }
        .docs-index details summary::after { display: none; }
        .docs-index details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
