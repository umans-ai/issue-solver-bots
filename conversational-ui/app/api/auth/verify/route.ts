import { NextResponse } from 'next/server';
import {
  ensureDefaultSpace,
  getUserByVerificationToken,
  verifyUserEmail,
} from '@/lib/db/queries';
import {
  isCodeIntentRedirect,
  sanitizeInternalRedirect,
} from '@/lib/redirect-intent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    const next = sanitizeInternalRedirect(body?.next);

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 },
      );
    }

    // Find user by verification token
    const [user] = await getUserByVerificationToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 },
      );
    }

    // Verify the user's email
    await verifyUserEmail(user.id, { codeIntent: isCodeIntentRedirect(next) });

    // Create default space for the newly verified user
    try {
      await ensureDefaultSpace(user.id);
    } catch (spaceError) {
      console.error(
        'Failed to create default space for verified user:',
        spaceError,
      );
      // Don't fail verification if space creation fails
    }

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 },
    );
  }
}
