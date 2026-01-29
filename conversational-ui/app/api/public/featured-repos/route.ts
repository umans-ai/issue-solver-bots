import { NextResponse } from 'next/server';
import { listFeaturedRepos } from '@/lib/db/queries';

export async function GET() {
  try {
    const repos = await listFeaturedRepos(50);
    return NextResponse.json({ repos });
  } catch (error) {
    console.error('Error listing featured repos:', error);
    return NextResponse.json(
      { error: 'Failed to list featured repos' },
      { status: 500 },
    );
  }
}
