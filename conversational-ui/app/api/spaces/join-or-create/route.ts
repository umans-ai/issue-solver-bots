import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createSpace,
  setSelectedSpace,
  getSpaceByKnowledgeBaseId,
  getFeaturedRepoByKbId,
} from '@/lib/db/queries';

/**
 * POST /api/spaces/join-or-create
 *
 * Joins an existing space or creates a new one for the authenticated user
 * based on the knowledge base ID. Used in the public wiki to chat conversion flow.
 *
 * Request Body:
 *   - knowledgeBaseId: string - The KB ID from the public wiki
 *   - pendingMessage?: string - Optional pending message (for logging/debugging)
 *
 * Response:
 *   - 200: Successfully joined existing space
 *   - 201: Successfully created new space
 *   - 401: Unauthorized (not authenticated)
 *   - 404: Knowledge base not found
 *   - 500: Server error
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const { knowledgeBaseId } = await request.json();

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: 'Knowledge base ID is required' },
        { status: 400 },
      );
    }

    // Check if user already has a space with this KB ID
    const existingSpace = await getSpaceByKnowledgeBaseId(
      userId,
      knowledgeBaseId,
    );

    if (existingSpace) {
      // User already has a space with this KB - set it as selected
      await setSelectedSpace(userId, existingSpace.id);

      return NextResponse.json(
        {
          space: existingSpace,
          created: false,
          message: 'Joined existing workspace',
        },
        { status: 200 },
      );
    }

    // Get repo info to use as space name
    const repoInfo = await getFeaturedRepoByKbId(knowledgeBaseId);
    const spaceName = repoInfo
      ? `${repoInfo.owner}/${repoInfo.name}`
      : 'Documentation Workspace';

    // Create a new space for this user with the KB ID
    const newSpace = await createSpace(
      spaceName,
      userId,
      knowledgeBaseId,
      undefined, // processId
      false, // isDefault
    );

    if (!newSpace) {
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 },
      );
    }

    // Set the new space as selected
    await setSelectedSpace(userId, newSpace.id);

    return NextResponse.json(
      {
        space: newSpace,
        created: true,
        message: 'Created new workspace',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in join-or-create space:', error);
    return NextResponse.json(
      { error: 'Failed to set up workspace' },
      { status: 500 },
    );
  }
}
