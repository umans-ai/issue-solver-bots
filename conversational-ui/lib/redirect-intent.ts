const CODE_INTENT_PATH_PREFIXES = ['/billing', '/offers/code', '/setup-cli'];

export function sanitizeInternalRedirect(next: unknown): string | null {
  if (typeof next !== 'string') {
    return null;
  }

  const trimmed = next.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  return trimmed;
}

export function isCodeIntentRedirect(next: unknown): boolean {
  const safeRedirect = sanitizeInternalRedirect(next);
  if (!safeRedirect) {
    return false;
  }

  try {
    const parsed = new URL(safeRedirect, 'http://localhost');
    return CODE_INTENT_PATH_PREFIXES.some((prefix) =>
      parsed.pathname.startsWith(prefix),
    );
  } catch {
    return false;
  }
}

export function getCodeOfferUrl(baseUrl: string): string {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname.startsWith('app.')) {
      const portSegment = parsed.port ? `:${parsed.port}` : '';
      return `${parsed.protocol}//code.${parsed.hostname.slice(4)}${portSegment}`;
    }
    return `${parsed.origin}/offers/code`;
  } catch {
    return 'https://code.umans.ai';
  }
}
