import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { featuredRepo } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to index a repository and add it to featured repos.
 * This creates/connects a repo and triggers indexing via the backend API.
 *
 * POST /api/admin/featured-repos/index
 * Body: { repoUrl: string, description?: string, language?: string, stars?: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add proper admin check - for now, allow any authenticated user in dev
    // const isAdmin = session.user.email.endsWith('@umans.ai');
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const body = await request.json();
    const { repoUrl, description, language, stars } = body;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing repoUrl parameter' },
        { status: 400 }
      );
    }

    // Parse owner and name from URL
    // Supports: https://github.com/owner/repo or https://github.com/owner/repo.git
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const owner = urlMatch[1].toLowerCase();
    const name = urlMatch[2].toLowerCase();

    // Check if already exists
    const existing = await db
      .select()
      .from(featuredRepo)
      .where(
        and(
          eq(featuredRepo.owner, owner),
          eq(featuredRepo.name, name)
        )
      )
      .then(rows => rows[0]);

    if (existing) {
      return NextResponse.json({
        message: 'Repository already exists',
        featuredRepo: existing,
        status: 'existing'
      });
    }

    // Create a system space for featured repos
    // This is a simplified approach - in production, you might want a dedicated system user
    const spaceName = `Featured: ${owner}/${name}`;

    // Call backend API to connect repository
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const backendResponse = await fetch(`${backendUrl}/repositories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add proper service-to-service auth
        'X-Service-Auth': process.env.INTERNAL_API_TOKEN || 'dev-token',
      },
      body: JSON.stringify({
        url: repoUrl,
        access_token: null, // Public repo, no token needed
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to connect repository', details: errorText },
        { status: 502 }
      );
    }

    const backendData = await backendResponse.json();
    const kbId = backendData.knowledge_base_id;
    const processId = backendData.process_id;

    if (!kbId) {
      return NextResponse.json(
        { error: 'Backend did not return knowledge_base_id' },
        { status: 502 }
      );
    }

    // Create featured repo record
    // Note: commitSha will be updated by the webhook when indexing completes
    const [newRepo] = await db
      .insert(featuredRepo)
      .values({
        owner,
        name,
        kbId,
        commitSha: 'pending', // Will be updated by webhook
        repoUrl,
        isActive: true,
        description: description || null,
        language: language || null,
        stars: stars || null,
      })
      .returning();

    return NextResponse.json({
      message: 'Repository indexing initiated',
      featuredRepo: newRepo,
      processId,
      status: 'indexing'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in featured repo indexing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler to list pending/being indexed repos
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pending = await db
      .select()
      .from(featuredRepo)
      .where(eq(featuredRepo.commitSha, 'pending'));

    return NextResponse.json({ pending });
  } catch (error) {
    console.error('Error listing pending repos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
