import { describe, it, expect } from 'vitest';
import {
  resolveLinkDestination,
  resolveRelativePath,
  buildRepoFileUrl,
} from './docs-utils';

describe('resolveLinkDestination', () => {
  const existingDocs = [
    'wiki/intro.md',
    'wiki/guides/setup.md',
    'repo-docs/README.md',
    'repo-docs/api/endpoints.md',
  ];
  const repoUrl = 'https://github.com/org/repo';
  const commitSha = 'abc123';

  describe('repo docs linking - preserves navigation when doc exists', () => {
    it('navigates internally when linking to another repo doc that exists', () => {
      const result = resolveLinkDestination(
        './api/endpoints.md',
        'repo-docs/README.md',
        existingDocs,
        repoUrl,
        commitSha,
      );

      expect(result).toEqual({
        type: 'internal',
        path: 'repo-docs/api/endpoints.md',
      });
    });

    it('navigates internally when linking from wiki to repo-docs', () => {
      const result = resolveLinkDestination(
        '../repo-docs/README.md',
        'wiki/intro.md',
        existingDocs,
        repoUrl,
        commitSha,
      );

      expect(result).toEqual({
        type: 'internal',
        path: 'repo-docs/README.md',
      });
    });
  });

  describe('repo docs linking - opens repo when doc does not exist in Umans', () => {
    it('opens repo URL when linking to a source file not in docs', () => {
      const result = resolveLinkDestination(
        '../src/utils/helpers.ts',
        'repo-docs/README.md',
        existingDocs,
        repoUrl,
        commitSha,
      );

      expect(result).toEqual({
        type: 'external',
        url: 'https://github.com/org/repo/blob/abc123/src/utils/helpers.ts',
      });
    });

    it('opens repo URL when linking to non-exported doc', () => {
      const result = resolveLinkDestination(
        './not-exported.md',
        'repo-docs/README.md',
        existingDocs,
        repoUrl,
        commitSha,
      );

      expect(result).toEqual({
        type: 'external',
        url: 'https://github.com/org/repo/blob/abc123/repo-docs/not-exported.md',
      });
    });
  });

  describe('edge cases', () => {
    it('returns unresolved when no repo URL configured', () => {
      const result = resolveLinkDestination(
        '../missing.md',
        'wiki/intro.md',
        existingDocs,
        undefined,
        commitSha,
      );

      expect(result).toEqual({
        type: 'unresolved',
        path: 'missing.md',
      });
    });
  });
});

describe('resolveRelativePath', () => {
  it('resolves parent directory traversal', () => {
    expect(resolveRelativePath('wiki/intro.md', '../repo-docs/README.md')).toBe(
      'repo-docs/README.md',
    );
  });

  it('resolves multiple parent traversals', () => {
    expect(
      resolveRelativePath('wiki/guides/setup.md', '../../repo-docs/api.md'),
    ).toBe('repo-docs/api.md');
  });

  it('resolves deep parent traversals', () => {
    expect(
      resolveRelativePath('wiki/guides/deep/file.md', '../../../top.md'),
    ).toBe('top.md');
  });

  it('resolves ./ to current directory', () => {
    expect(resolveRelativePath('wiki/intro.md', './other.md')).toBe(
      'wiki/other.md',
    );
  });

  it('resolves sibling files to current directory', () => {
    expect(resolveRelativePath('wiki/intro.md', 'sibling.md')).toBe(
      'wiki/sibling.md',
    );
  });

  it('handles traversal from root-level file', () => {
    expect(resolveRelativePath('single.md', '../outside.md')).toBe(
      'outside.md',
    );
  });

  it('strips leading slash for absolute paths', () => {
    expect(resolveRelativePath('wiki/intro.md', '/absolute/path.md')).toBe(
      'absolute/path.md',
    );
  });
});

describe('buildRepoFileUrl', () => {
  it('builds URL with commit SHA', () => {
    expect(
      buildRepoFileUrl('https://github.com/org/repo', 'src/index.ts', 'abc123'),
    ).toBe('https://github.com/org/repo/blob/abc123/src/index.ts');
  });

  it('uses HEAD when no commit SHA provided', () => {
    expect(
      buildRepoFileUrl('https://github.com/org/repo', 'README.md', undefined),
    ).toBe('https://github.com/org/repo/blob/HEAD/README.md');
  });

  it('strips .git suffix', () => {
    expect(
      buildRepoFileUrl('https://github.com/org/repo.git', 'file.ts', 'sha'),
    ).toBe('https://github.com/org/repo/blob/sha/file.ts');
  });

  it('strips trailing slash', () => {
    expect(
      buildRepoFileUrl('https://gitlab.com/org/repo/', 'lib/utils.py', 'def'),
    ).toBe('https://gitlab.com/org/repo/blob/def/lib/utils.py');
  });

  it('works with GitLab', () => {
    expect(
      buildRepoFileUrl('https://gitlab.com/org/repo', 'src/main.rs', 'v1'),
    ).toBe('https://gitlab.com/org/repo/blob/v1/src/main.rs');
  });

  it('works with Bitbucket', () => {
    expect(
      buildRepoFileUrl(
        'https://bitbucket.org/org/repo',
        'package.json',
        'main',
      ),
    ).toBe('https://bitbucket.org/org/repo/blob/main/package.json');
  });

  it('returns null when no repo URL', () => {
    expect(buildRepoFileUrl(undefined, 'file.ts', 'sha')).toBeNull();
  });
});
