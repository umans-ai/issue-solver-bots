import { describe, it, expect } from 'vitest';

/**
 * Parse owner and name from GitHub repository URL
 * Supports: https://github.com/owner/repo or https://github.com/owner/repo.git
 */
function parseGitHubUrl(repoUrl: string): { owner: string; name: string } | null {
  const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  if (!urlMatch) {
    return null;
  }
  return {
    owner: urlMatch[1].toLowerCase(),
    name: urlMatch[2].toLowerCase(),
  };
}

/**
 * Format star count for display (e.g., 12345 -> "12k")
 */
function formatStars(stars: number | null): string {
  if (!stars) return '0';
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(0)}k`;
  }
  return String(stars);
}

/**
 * Format indexed date as relative time
 */
function formatLastIndexed(date: Date | string | null, now: Date = new Date()): string {
  if (!date) return 'recently';
  const indexed = new Date(date);
  const diffMs = now.getTime() - indexed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

describe('parseGitHubUrl', () => {
  it('parses standard GitHub URL', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('parses URL with .git suffix', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react.git');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('converts owner and name to lowercase', () => {
    const result = parseGitHubUrl('https://github.com/Facebook/React');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('parses URL with hyphenated names', () => {
    const result = parseGitHubUrl('https://github.com/shadcn-ui/ui');
    expect(result).toEqual({ owner: 'shadcn-ui', name: 'ui' });
  });

  it('returns null for URL with dot in name (not supported)', () => {
    // GitHub repos typically don't have dots, our regex stops at first dot
    const result = parseGitHubUrl('https://github.com/owner/repo.name');
    expect(result).toBeNull();
  });

  it('returns null for URL with trailing slash (not supported)', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react/');
    expect(result).toBeNull();
  });

  it('returns null for invalid GitHub URL', () => {
    const result = parseGitHubUrl('https://gitlab.com/user/repo');
    expect(result).toBeNull();
  });

  it('returns null for incomplete URL', () => {
    const result = parseGitHubUrl('https://github.com/facebook');
    expect(result).toBeNull();
  });

  it('returns null for non-URL string', () => {
    const result = parseGitHubUrl('not-a-url');
    expect(result).toBeNull();
  });
});

describe('formatStars', () => {
  it('formats null as 0', () => {
    expect(formatStars(null)).toBe('0');
  });

  it('formats 0 as 0', () => {
    expect(formatStars(0)).toBe('0');
  });

  it('formats single digit without suffix', () => {
    expect(formatStars(5)).toBe('5');
  });

  it('formats hundreds without suffix', () => {
    expect(formatStars(999)).toBe('999');
  });

  it('formats 1000 as 1k', () => {
    expect(formatStars(1000)).toBe('1k');
  });

  it('formats thousands with k suffix', () => {
    expect(formatStars(12345)).toBe('12k');
  });

  it('formats large numbers with k suffix', () => {
    expect(formatStars(123456)).toBe('123k');
  });
});

describe('formatLastIndexed', () => {
  it('formats null as recently', () => {
    expect(formatLastIndexed(null)).toBe('recently');
  });

  it('formats 30 seconds ago as just now', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-15T09:59:30Z');
    expect(formatLastIndexed(indexed, now)).toBe('just now');
  });

  it('formats 5 minutes ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-15T09:55:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('5m ago');
  });

  it('formats 59 minutes ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-15T09:01:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('59m ago');
  });

  it('formats 2 hours ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-15T08:00:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('2h ago');
  });

  it('formats 23 hours ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-14T11:00:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('23h ago');
  });

  it('formats 1 day ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-14T10:00:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('1d ago');
  });

  it('formats 5 days ago', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    const indexed = new Date('2024-01-10T10:00:00Z');
    expect(formatLastIndexed(indexed, now)).toBe('5d ago');
  });

  it('handles string date input', () => {
    const now = new Date('2024-01-15T10:00:00Z');
    expect(formatLastIndexed('2024-01-15T09:00:00Z', now)).toBe('1h ago');
  });
});
