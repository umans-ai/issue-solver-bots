import { describe, it, expect } from 'vitest';
import { getWikiPages, type WikiPageManifest } from './wiki-store';

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
