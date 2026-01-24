import { describe, it, expect } from 'vitest';
import {
  getWikiPages,
  stripRepoDocsPrefix,
  REPO_DOCS_PREFIX,
  type WikiPageManifest,
} from './wiki-store';

describe('getWikiPages', () => {
  it('returns empty array for null manifest', () => {
    expect(getWikiPages(null)).toEqual([]);
  });

  it('returns empty array for empty manifest', () => {
    expect(getWikiPages({})).toEqual([]);
  });

  it('returns wiki entries when wiki key exists', () => {
    const manifest: WikiPageManifest = {
      wiki: [
        { path: 'intro.md', purpose: 'Introduction' },
        { path: 'setup', purpose: 'Getting started' },
      ],
    };
    expect(getWikiPages(manifest)).toEqual([
      { path: 'intro.md', purpose: 'Introduction' },
      { path: 'setup', purpose: 'Getting started' },
    ]);
  });

  it('returns pages entries when pages key exists (backwards compat)', () => {
    const manifest: WikiPageManifest = {
      pages: [
        { path: 'overview.md' },
        { path: 'api-reference.md' },
      ],
    };
    expect(getWikiPages(manifest)).toEqual([
      { path: 'overview.md' },
      { path: 'api-reference.md' },
    ]);
  });

  it('prefers wiki over pages when both exist', () => {
    const manifest: WikiPageManifest = {
      wiki: [{ path: 'from-wiki.md' }],
      pages: [{ path: 'from-pages.md' }],
    };
    expect(getWikiPages(manifest)).toEqual([{ path: 'from-wiki.md' }]);
  });

  it('ignores repo-docs config (not a page list)', () => {
    const manifest: WikiPageManifest = {
      'repo-docs': {
        include: ['docs/**/*.md'],
        exclude: ['docs/internal/**'],
      },
    };
    expect(getWikiPages(manifest)).toEqual([]);
  });

  it('handles manifest with all keys', () => {
    const manifest: WikiPageManifest = {
      wiki: [{ path: 'wiki-page.md', purpose: 'Auto-generated' }],
      pages: [{ path: 'old-page.md' }],
      'repo-docs': { include: ['**/*.md'] },
    };
    expect(getWikiPages(manifest)).toEqual([
      { path: 'wiki-page.md', purpose: 'Auto-generated' },
    ]);
  });
});

describe('stripRepoDocsPrefix', () => {
  it('strips repo-docs/ prefix from path', () => {
    expect(stripRepoDocsPrefix('repo-docs/README.md')).toBe('README.md');
  });

  it('strips prefix from nested paths', () => {
    expect(stripRepoDocsPrefix('repo-docs/api/auth.md')).toBe('api/auth.md');
  });

  it('leaves wiki paths unchanged', () => {
    expect(stripRepoDocsPrefix('overview.md')).toBe('overview.md');
  });

  it('leaves nested wiki paths unchanged', () => {
    expect(stripRepoDocsPrefix('guides/setup.md')).toBe('guides/setup.md');
  });

  it('does not strip partial matches', () => {
    expect(stripRepoDocsPrefix('repo-docs-extra/file.md')).toBe(
      'repo-docs-extra/file.md',
    );
  });

  it('exports the prefix constant', () => {
    expect(REPO_DOCS_PREFIX).toBe('repo-docs/');
  });
});
