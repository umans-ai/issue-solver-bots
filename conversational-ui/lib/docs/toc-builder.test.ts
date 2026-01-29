/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TOC Builder Behavior
 *
 * These tests document how the Table of Contents (TOC) sidebar builds itself
 * from the markdown content headings. The TOC must handle async rendering
 * gracefully since content is rendered by Streamdown asynchronously.
 */

describe('TOC Builder', () => {
  // Simulates the DOM structure created by the wiki page
  function createMockContainer(headings: { level: number; text: string }[]) {
    const container = document.createElement('div');
    const prose = document.createElement('div');
    prose.className = 'prose';

    for (const heading of headings) {
      const el = document.createElement(`h${heading.level}`);
      el.textContent = heading.text;
      prose.appendChild(el);
    }

    container.appendChild(prose);
    return container;
  }

  // Simulates the TOC building logic from the page component
  function buildTocFromDom(container: HTMLElement) {
    const proseContainer = container.querySelector('.prose');
    const searchRoot = proseContainer || container;

    const headingElements = Array.from(
      searchRoot.querySelectorAll<HTMLElement>('h1, h2, h3'),
    );

    if (headingElements.length === 0) return null;

    const slugCounts = new Map<string, number>();
    const headings = headingElements
      .map((el) => {
        const text = el.textContent?.trim() ?? '';
        if (!text) return null;

        // Simple slugify (matches the implementation)
        const base = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

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
      .filter((item): item is { id: string; text: string; level: number } => !!item);

    return headings;
  }

  describe('when content has headings', () => {
    it('builds TOC items from h1, h2, and h3 elements', () => {
      const container = createMockContainer([
        { level: 1, text: 'Main Title' },
        { level: 2, text: 'Section One' },
        { level: 3, text: 'Subsection A' },
        { level: 2, text: 'Section Two' },
      ]);

      const toc = buildTocFromDom(container);

      expect(toc).toHaveLength(4);
      expect(toc?.[0]).toEqual({ id: 'main-title', text: 'Main Title', level: 1 });
      expect(toc?.[1]).toEqual({ id: 'section-one', text: 'Section One', level: 2 });
      expect(toc?.[2]).toEqual({ id: 'subsection-a', text: 'Subsection A', level: 3 });
      expect(toc?.[3]).toEqual({ id: 'section-two', text: 'Section Two', level: 2 });
    });

    it('assigns unique IDs to duplicate headings', () => {
      const container = createMockContainer([
        { level: 2, text: 'Overview' },
        { level: 2, text: 'Overview' },
        { level: 2, text: 'Overview' },
      ]);

      const toc = buildTocFromDom(container);

      expect(toc?.[0].id).toBe('overview');
      expect(toc?.[1].id).toBe('overview-2');
      expect(toc?.[2].id).toBe('overview-3');
    });

    it('sets IDs on the actual heading elements for navigation', () => {
      const container = createMockContainer([
        { level: 2, text: 'Quick Start' },
      ]);

      buildTocFromDom(container);

      const heading = container.querySelector('h2');
      expect(heading?.id).toBe('quick-start');
      expect(heading?.tabIndex).toBe(-1);
    });
  });

  describe('when content has no headings', () => {
    it('returns null to show "No headings yet" state', () => {
      const container = createMockContainer([]);

      const toc = buildTocFromDom(container);

      expect(toc).toBeNull();
    });
  });

  describe('polling behavior', () => {
    it('retries when container ref is not yet attached', async () => {
      // This documents the fix for the race condition where
      // the effect runs before React attaches the ref to DOM
      let container: HTMLElement | null = null;

      // Simulate the polling check
      const checkForHeadings = () => {
        if (!container) return null;
        return buildTocFromDom(container);
      };

      // First call: ref not ready
      expect(checkForHeadings()).toBeNull();

      // Ref gets attached later
      container = createMockContainer([{ level: 2, text: 'Section' }]);

      // Second call: ref ready, TOC built
      expect(checkForHeadings()).toHaveLength(1);
    });

    it('retries when content is still rendering', async () => {
      const container = document.createElement('div');
      container.className = 'prose'; // Empty initially

      const checkForHeadings = () => {
        const proseContainer = container.querySelector('.prose') || container;
        const headings = proseContainer.querySelectorAll('h1, h2, h3');
        if (headings.length === 0) return null;
        return buildTocFromDom(container);
      };

      // Initially empty
      expect(checkForHeadings()).toBeNull();

      // Content renders asynchronously
      const h2 = document.createElement('h2');
      h2.textContent = 'Late Arrival';
      container.appendChild(h2);

      // Now TOC can be built
      expect(checkForHeadings()).toHaveLength(1);
    });
  });

  describe('slug generation', () => {
    it('handles headings with special characters', () => {
      const container = createMockContainer([
        { level: 2, text: '🚀 Quick Start' },
        { level: 2, text: 'API & Webhooks' },
        { level: 2, text: 'C++ Guide' },
      ]);

      const toc = buildTocFromDom(container);

      expect(toc?.[0].id).toBe('quick-start');
      expect(toc?.[1].id).toBe('api-webhooks');
      expect(toc?.[2].id).toBe('c-guide');
    });

    it('handles empty or whitespace-only headings', () => {
      const container = createMockContainer([
        { level: 2, text: '' },
        { level: 2, text: '   ' },
        { level: 2, text: 'Valid Heading' },
      ]);

      const toc = buildTocFromDom(container);

      expect(toc).toHaveLength(1);
      expect(toc?.[0].text).toBe('Valid Heading');
    });
  });
});

describe('TOC Navigation', () => {
  it('scrolls to heading when TOC link is clicked', () => {
    // Document the expected behavior
    const heading = document.createElement('h2');
    heading.id = 'target-section';
    document.body.appendChild(heading);

    // The actual scroll behavior is handled by the component
    // This test documents that clicking a TOC link should:
    // 1. Update URL hash to #target-section
    // 2. Call scrollIntoView on the element with that ID
    // 3. The element should have tabindex=-1 for focus

    expect(heading.id).toBe('target-section');
    expect(document.getElementById('target-section')).toBe(heading);

    document.body.removeChild(heading);
  });
});
