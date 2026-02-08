import { db } from '@/lib/db';
import { featuredRepo } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint called by the backend when indexing completes.
 * Updates the featured repo with the new commit SHA and triggers auto-doc generation.
 *
 * POST /api/webhooks/indexing-complete
 * Body: { kbId: string, commitSha: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (TODO: implement proper signature verification)
    const signature = request.headers.get('X-Webhook-Signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { kbId, commitSha } = body;

    if (!kbId || !commitSha) {
      return NextResponse.json(
        { error: 'Missing kbId or commitSha' },
        { status: 400 }
      );
    }

    // Find featured repo by kbId
    const repo = await db
      .select()
      .from(featuredRepo)
      .where(eq(featuredRepo.kbId, kbId))
      .then(rows => rows[0]);

    if (!repo) {
      // Not a featured repo, ignore
      return NextResponse.json({ message: 'Not a featured repo, ignored' });
    }

    // Update commit SHA and indexedAt
    const [updated] = await db
      .update(featuredRepo)
      .set({
        commitSha,
        indexedAt: new Date(),
      })
      .where(eq(featuredRepo.id, repo.id))
      .returning();

    // Trigger auto-doc generation
    // This happens automatically via the existing IndexedCompleted event handler
    // in the backend worker, so we don't need to do anything here.
    // The backend will generate docs and they'll be available via the public API.

    return NextResponse.json({
      message: 'Featured repo updated',
      repo: updated,
    });

  } catch (error) {
    console.error('Error in indexing-complete webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
