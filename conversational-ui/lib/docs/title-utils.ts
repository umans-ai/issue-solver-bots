/**
 * Utilities for extracting clean document titles from markdown content.
 */

/**
 * Strips markdown link and image syntax from text, leaving only the readable text.
 * Useful for cleaning up titles that contain badges like [![Build Status](...)].
 */
export function stripMarkdownSyntax(text: string): string {
  // Remove inline images: ![alt](url) - badges are typically not meaningful text
  let result = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // Remove links but keep link text: [text](url) -> text
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Clean up extra whitespace
  return result.trim().replace(/\s+/g, ' ');
}

/**
 * Extracts a clean title from markdown content by finding the first H1 heading
 * and stripping any markdown syntax (links, images) from it.
 */
export function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return stripMarkdownSyntax(match[1].trim());
  }
  return fallback;
}
