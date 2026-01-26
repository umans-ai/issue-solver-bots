import { describe, it, expect } from 'vitest';
import { stripMarkdownSyntax, extractTitle } from './title-utils';

describe('stripMarkdownSyntax', () => {
  it('removes badge images from text', () => {
    // Given a title with a CI badge image
    const titleWithBadge =
      'Spring PetClinic [![Build Status](https://github.com/spring-projects/spring-petclinic/actions/workflows/maven-build.yml/badge.svg)](https://github.com/spring-projects/spring-petclinic/actions/workflows/maven-build.yml)';

    // When stripping markdown syntax
    const result = stripMarkdownSyntax(titleWithBadge);

    // Then only the readable title remains
    expect(result).toBe('Spring PetClinic');
  });

  it('removes multiple badge images', () => {
    // Given a title with multiple CI badges
    const titleWithMultipleBadges =
      'My Project [![Maven](https://example.com/maven.svg)](https://example.com)[![Gradle](https://example.com/gradle.svg)](https://example.com)';

    // When stripping markdown syntax
    const result = stripMarkdownSyntax(titleWithMultipleBadges);

    // Then only the readable title remains
    expect(result).toBe('My Project');
  });

  it('preserves link text while removing link markup', () => {
    // Given a title with a text link
    const titleWithLink = 'Welcome to [My Project](https://example.com)';

    // When stripping markdown syntax
    const result = stripMarkdownSyntax(titleWithLink);

    // Then the link text is preserved
    expect(result).toBe('Welcome to My Project');
  });

  it('returns plain text unchanged', () => {
    // Given a plain text title
    const plainTitle = 'Simple Project Name';

    // When stripping markdown syntax
    const result = stripMarkdownSyntax(plainTitle);

    // Then the text is unchanged
    expect(result).toBe('Simple Project Name');
  });

  it('collapses multiple spaces left by removed elements', () => {
    // Given a title where badge removal would leave multiple spaces
    const titleWithGaps =
      'Project   ![badge](url)   Name   ![another](url)   Here';

    // When stripping markdown syntax
    const result = stripMarkdownSyntax(titleWithGaps);

    // Then spaces are normalized
    expect(result).toBe('Project Name Here');
  });
});

describe('extractTitle', () => {
  it('extracts clean title from README with badges', () => {
    // Given markdown content with a badge-laden H1
    const content = `# Spring PetClinic Sample Application [![Build Status](https://github.com/spring-projects/spring-petclinic/actions/workflows/maven-build.yml/badge.svg)](https://github.com/spring-projects/spring-petclinic/actions/workflows/maven-build.yml)[![Build Status](https://github.com/spring-projects/spring-petclinic/actions/workflows/gradle-build.yml/badge.svg)](https://github.com/spring-projects/spring-petclinic/actions/workflows/gradle-build.yml)

Some description here.`;

    // When extracting the title
    const result = extractTitle(content, 'README.md');

    // Then a clean title is returned
    expect(result).toBe('Spring PetClinic Sample Application');
  });

  it('extracts plain title when no markdown syntax present', () => {
    // Given markdown content with a simple H1
    const content = `# Getting Started Guide

This guide will help you...`;

    // When extracting the title
    const result = extractTitle(content, 'guide.md');

    // Then the title is extracted as-is
    expect(result).toBe('Getting Started Guide');
  });

  it('returns fallback when no H1 heading exists', () => {
    // Given markdown content without an H1
    const content = `## This is an H2

Some content without a main heading.`;

    // When extracting the title
    const result = extractTitle(content, 'document.md');

    // Then the fallback is returned
    expect(result).toBe('document.md');
  });

  it('returns fallback for empty content', () => {
    // Given empty content
    const content = '';

    // When extracting the title
    const result = extractTitle(content, 'empty.md');

    // Then the fallback is returned
    expect(result).toBe('empty.md');
  });

  it('finds H1 even when not on first line', () => {
    // Given markdown with H1 after some front matter
    const content = `---
title: metadata
---

# Actual Title

Content here.`;

    // When extracting the title
    const result = extractTitle(content, 'file.md');

    // Then the H1 is found
    expect(result).toBe('Actual Title');
  });
});
