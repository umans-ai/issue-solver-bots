# Public Wiki Implementation Plan

## Overview
Enable public access to featured repository wikis via `wiki.umans.ai/owner/repo` URLs, reusing existing wiki infrastructure with minimal new code.

## URL Flow
```
wiki.umans.ai/facebook/react
  → (CloudFront redirect)
  → app.umans.ai/offers/wiki/facebook/react
  → (Next.js rewrite)
  → app.umans.ai/docs/public/facebook/react
```

---

## Phase 1: Database & Configuration

### 1.1 Database Migration
**File:** `conversational-ui/lib/db/schema.ts`

Add `featuredRepo` table:
```typescript
export const featuredRepo = pgTable('FeaturedRepo', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  owner: text('owner').notNull(),           // "facebook"
  name: text('name').notNull(),             // "react"
  kbId: text('kbId').notNull(),             // S3 base path
  commitSha: text('commitSha').notNull(),   // Latest indexed version
  repoUrl: text('repoUrl').notNull(),       // Full GitHub URL
  isActive: boolean('isActive').notNull().default(true),
  stars: integer('stars'),                  // For display
  description: text('description'),         // For SEO/meta
  language: text('language'),               // For display
  indexedAt: timestamp('indexedAt').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => {
  return {
    uniqueOwnerName: uniqueIndex('unique_owner_name').on(table.owner, table.name),
    activeIdx: index('featured_repo_active_idx').on(table.isActive),
  };
});

export type FeaturedRepo = InferSelectModel<typeof featuredRepo>;
```

**Migration:** Run `pnpm db:generate && pnpm db:migrate`

### 1.2 Middleware Updates
**File:** `conversational-ui/middleware.ts`

Add public path exemptions before `auth()`:
```typescript
// Public wiki paths (no auth required)
if (req.nextUrl.pathname.startsWith('/docs/public/') ||
    req.nextUrl.pathname.startsWith('/api/public/')) {
  return NextResponse.next();
}
```

### 1.3 Next.js Rewrites
**File:** `conversational-ui/next.config.ts`

Add rewrite:
```typescript
{
  source: '/offers/wiki/:owner/:repo/:path*',
  destination: '/docs/public/:owner/:repo/:path*',
}
```

---

## Phase 2: Public API Routes

Thin wrappers around existing `lib/docs/wiki-store.ts` functions, with `owner/name` → `kbId` resolution.

### 2.1 Lookup Utility
**File:** `conversational-ui/lib/db/queries.ts`

```typescript
export async function getFeaturedRepoByOwnerAndName(
  owner: string,
  name: string
): Promise<FeaturedRepo | null> {
  return db
    .select()
    .from(featuredRepo)
    .where(
      and(
        eq(featuredRepo.owner, owner.toLowerCase()),
        eq(featuredRepo.name, name.toLowerCase()),
        eq(featuredRepo.isActive, true)
      )
    )
    .then((repos) => repos[0] || null);
}

export async function listFeaturedRepos(
  limit: number = 50
): Promise<FeaturedRepo[]> {
  return db
    .select()
    .from(featuredRepo)
    .where(eq(featuredRepo.isActive, true))
    .orderBy(desc(featuredRepo.stars))
    .limit(limit);
}
```

### 2.2 API Routes

**Base:** `conversational-ui/app/api/public/docs/[owner]/[repo]/`

| Route | Purpose |
|-------|---------|
| `route.ts` (GET) | Returns repo metadata (kbId, commitSha, available versions) |
| `list/route.ts` (GET) | Returns file list + manifest: `?v={optionalCommit}` |
| `file/route.ts` (GET) | Returns file content: `?path=...&v={optional}` |
| `search/route.ts` (GET) | Full-text search: `?q=...&v={optional}` |

Each route:
1. Validates `owner`/`repo` params
2. Looks up `kbId` via `getFeaturedRepoByOwnerAndName`
3. Returns 404 if not found
4. Calls existing wiki-store functions with resolved `kbId`
5. Returns JSON (same schema as authenticated `/api/docs/*` routes)

Example `file/route.ts`:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const version = searchParams.get('v');

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const featured = await getFeaturedRepoByOwnerAndName(owner, repo);
  if (!featured) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  const commitSha = version || featured.commitSha;
  const content = await getWikiDocContent(featured.kbId, commitSha, path);

  if (content === null) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({ content, path, commitSha });
}
```

---

## Phase 3: Public Wiki Page

### 3.1 Page Structure
**File:** `conversational-ui/app/docs/public/[owner]/[repo]/page.tsx`

Simplified version of `docs/[spaceId]/[[...path]]/page.tsx`:

**State Management:**
- `kbId`, `commitSha` from API (not from session)
- `fileList`, `manifest`, `titleMap` from `/api/public/docs/:owner/:repo/list`
- `activePath`, `content` from `/api/public/docs/:owner/:repo/file`
- `isSearchOpen`, `q`, `results` for search
- `chatDraft` for chat input
- `hasAutoSelected` - prevents repeated auto-selection

**Auto-Select First Document:**
When user visits without a path parameter, automatically selects the first file:

```typescript
useEffect(() => {
  if (hasAutoSelected) return;
  if (!fileListData?.files?.length) return;
  if (searchParams?.get('path')) return;
  if (activePath) return;

  setHasAutoSelected(true);
  const firstFile = fileListData.files[0];
  navigateToPath(firstFile);
}, [fileListData, activePath, searchParams, hasAutoSelected, navigateToPath]);
```

**UI Components (all reused):**
- Doc tree navigation (extracted shared component)
- Version selector (shows commit SHA, "Latest" badge)
- Markdown rendering (`DocsMarkdown`)
- TOC sidebar
- Search overlay
- Chat CTA at bottom

**Removed Features:**
- Space selector
- Auto-doc settings panel
- Approval buttons
- Generate/regenerate controls
- Download/copy markdown buttons (can keep if desired)

### 3.2 Chat CTA Flow

**Component:** `components/wiki/chat-cta.tsx`

```typescript
const handleSubmit = () => {
  const trimmed = value.trim();
  if (!trimmed || !kbId) return;

  // Store for post-auth restoration
  localStorage.setItem('pending_chat_message', JSON.stringify(trimmed));
  localStorage.setItem('knowledge_base_id', JSON.stringify(kbId));

  // Notify parent component
  onSubmit();

  // Redirect to login with next param to continue flow after auth
  window.location.href = '/login?next=/continue';
};
```

**Post-Auth Flow:** `/app/(auth)/continue/page.tsx`

1. User submits message on public wiki → stores in localStorage
2. Redirected to `/login?next=/continue`
3. After auth, lands on `/continue` which:
   - Reads pending message and KB ID from localStorage
   - Calls `/api/spaces/join-or-create` to find/create space
   - Redirects to `/` (home) where message is auto-sent

### 3.3 Shared Components Extraction
Extract from `docs/[spaceId]/[[...path]]/page.tsx`:

| Component | Source | New Location |
|-----------|--------|--------------|
| `DocTree` | File tree rendering | `components/wiki/doc-tree.tsx` |
| `VersionSelector` | SHA dropdown | `components/wiki/version-selector.tsx` |
| `SearchOverlay` | Command-K search | `components/wiki/search-overlay.tsx` |
| `TOCSidebar` | "On this page" | `components/wiki/toc-sidebar.tsx` |
| `ChatCTA` | Bottom chat input | `components/wiki/chat-cta.tsx` |

---

## Phase 4: Indexing Trigger (Local Testing)

### 4.1 Admin API Endpoint
**File:** `conversational-ui/app/api/admin/featured-repos/index/route.ts`

```typescript
POST /api/admin/featured-repos/index
Body: { "repoUrl": "https://github.com/owner/repo" }

Response: { "featuredRepoId": "...", "kbId": "...", "status": "indexing" }
```

**Flow:**
1. Validates admin auth (check session user is admin)
2. Parses owner/name from URL
3. Checks if already exists → returns existing
4. Creates a new "system" space for featured repos (or uses existing)
5. Calls backend `POST /repositories` with repo details
6. Creates `featuredRepo` record with returned `kbId`
7. Returns immediately (indexing happens async)

### 4.2 Update on Index Complete
When `IndexedCompleted` event fires (handled by existing worker), update `featuredRepo.commitSha`:

**New Event Handler:** `conversational-ui/app/api/webhooks/indexing-complete/route.ts`
```typescript
POST /api/webhooks/indexing-complete
Body: { "kbId": "...", "commitSha": "..." }

→ Finds featuredRepo by kbId
→ Updates commitSha to latest
→ Triggers auto-doc generation if not already done
```

---

## Phase 5: Landing Page Updates

### 5.1 Dynamic Featured Repos
**File:** `conversational-ui/app/offers/wiki/page.tsx`

Replace hardcoded `FEATURED_REPOS` with:
```typescript
const { data: repos } = useSWR('/api/public/featured-repos', fetcher);
```

Update card to link to wiki:
```typescript
<Link href={`/offers/wiki/${repo.owner}/${repo.name}`}>
  <Button>Open Wiki</Button>
</Link>
```

### 5.2 Not Found State
When repo not found in featured list:
- Show "Not indexed yet" card
- Display existing `RequestRepoDialog`

---

## Phase 6: Testing Strategy

### 6.1 Local Development Flow
```bash
# 1. Start services
just start-services

# 2. Start frontend
just dev

# 3. Index a tiny repo
curl -X POST http://localhost:3000/api/admin/featured-repos/index \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/octocat/Hello-World"}'

# 4. Check status (poll until indexed)
curl http://localhost:3000/api/public/docs/octocat/hello-world

# 5. Visit
open http://localhost:3000/offers/wiki/octocat/hello-world
```

### 6.2 Test Scenarios
| Test | Expected | Status |
|------|----------|--------|
| Visit public wiki unauthenticated | Shows wiki content, no auth prompt | ✓ Working |
| Visit wiki without path parameter | Auto-redirects to first file (e.g., README.md) | ✓ Working |
| Click chat input, type, press Enter | Redirects to /login?next=/continue, message stored | ✓ Working |
| Login after chat submit | Lands on /continue → /, space created/joined | ✓ Working |
| Search in public wiki | Returns results, clickable navigation | ✓ Working |
| Request non-existent repo | Shows "Not found" error state | ✓ Working |
| Switch version via dropdown | Shows correct commit SHA content | ✓ Working |

---

## File Checklist

### New Files
- [x] `lib/db/schema.ts` - Add `featuredRepo` table
- [x] `lib/db/queries.ts` - Add featured repo queries
- [x] `app/api/public/docs/[owner]/[repo]/route.ts`
- [x] `app/api/public/docs/[owner]/[repo]/list/route.ts`
- [x] `app/api/public/docs/[owner]/[repo]/file/route.ts`
- [x] `app/api/public/docs/[owner]/[repo]/search/route.ts`
- [x] `app/api/public/featured-repos/route.ts`
- [ ] `app/api/admin/featured-repos/index/route.ts` (optional - for admin UI)
- [ ] `app/api/webhooks/indexing-complete/route.ts` (optional - can poll instead)
- [x] `app/docs/public/[owner]/[repo]/page.tsx`
- [x] `app/(auth)/continue/page.tsx` - Post-auth handler for chat conversion
- [x] `components/wiki/doc-tree.tsx`
- [x] `components/wiki/version-selector.tsx`
- [x] `components/wiki/search-overlay.tsx`
- [x] `components/wiki/toc-sidebar.tsx`
- [x] `components/wiki/chat-cta.tsx`

### Modified Files
- [x] `middleware.ts` - Add public path exemptions
- [x] `next.config.ts` - Add rewrite rule
- [x] `app/offers/wiki/page.tsx` - Use dynamic featured repos list
- [ ] `app/docs/[spaceId]/[[...path]]/page.tsx` - Use extracted components (future refactor)

---

## Deployment Notes

1. **Database:** Run migrations before deploying code
2. **Featured Repos:** Populate via admin API or direct DB insert
3. **CloudFront:** No changes needed (existing redirect preserved)
4. **Backend:** No changes needed (reuses existing indexing/events)

---

## Future Enhancements (Post-MVP)

- [ ] Auto-refresh featured repos on new commits
- [ ] Public repo search/discovery page
- [ ] "Make my repo public" user-facing toggle
- [ ] Analytics on most-viewed public wikis
- [ ] SEO: sitemap.xml for all public wikis
