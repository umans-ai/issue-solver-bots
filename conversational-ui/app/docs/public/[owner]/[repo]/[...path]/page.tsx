'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// This is a redirect page that converts the path segments into a query parameter
// and redirects to the main public docs page
export default function PublicDocsPathRedirect() {
  const params = useParams<{ owner: string; repo: string; path: string[] }>();
  const router = useRouter();

  useEffect(() => {
    const owner = typeof params?.owner === 'string' ? params.owner : '';
    const repo = typeof params?.repo === 'string' ? params.repo : '';
    const pathSegments = Array.isArray(params?.path) ? params.path : [];

    if (!owner || !repo) {
      router.push('/');
      return;
    }

    const path = pathSegments.map((segment) => decodeURIComponent(segment)).join('/');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const targetUrl = `/docs/public/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?path=${encodeURIComponent(path)}${hash}`;

    router.replace(targetUrl);
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
