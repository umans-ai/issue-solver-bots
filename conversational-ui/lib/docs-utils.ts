export type LinkDestination =
  | { type: 'internal'; path: string }
  | { type: 'external'; url: string }
  | { type: 'unresolved'; path: string };

export function resolveLinkDestination(
  href: string,
  currentPath: string,
  existingDocPaths: string[],
  repoUrl?: string,
  commitSha?: string,
): LinkDestination {
  const resolvedPath = resolveRelativePath(currentPath, href);
  const existsInDocs = existingDocPaths.includes(resolvedPath);

  if (existsInDocs) {
    return { type: 'internal', path: resolvedPath };
  }

  const externalUrl = buildRepoFileUrl(repoUrl, resolvedPath, commitSha);
  if (externalUrl) {
    return { type: 'external', url: externalUrl };
  }

  return { type: 'unresolved', path: resolvedPath };
}

export function resolveRelativePath(
  basePath: string,
  relativePath: string,
): string {
  if (relativePath.startsWith('/')) {
    return relativePath.slice(1);
  }

  const baseDirectory = basePath.includes('/')
    ? basePath.substring(0, basePath.lastIndexOf('/'))
    : '';

  const normalizedHref = relativePath.replace(/^\.\//, '');

  if (!normalizedHref.startsWith('../')) {
    return baseDirectory
      ? `${baseDirectory}/${normalizedHref}`
      : normalizedHref;
  }

  const baseParts = baseDirectory ? baseDirectory.split('/') : [];
  const hrefParts = normalizedHref.split('/');

  for (const part of hrefParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

export function buildRepoFileUrl(
  repoUrl: string | undefined,
  filePath: string,
  commitSha?: string,
): string | null {
  if (!repoUrl) return null;

  const normalizedRepoUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
  const ref = commitSha || 'HEAD';
  return `${normalizedRepoUrl}/blob/${ref}/${filePath}`;
}
