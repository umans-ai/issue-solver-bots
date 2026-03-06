import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { user, pledge, accountReactivation } from '@/lib/db/schema';
import { notifyGateway } from '@/lib/code-gateway/account-status';
import { sendAccountReactivatedEmail } from '@/lib/email';
import { eq, and } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Admin whitelist is configured via ADMIN_REACTIVATION_ADMINS env var (comma-separated UUIDs)
// Example: ADMIN_REACTIVATION_ADMINS="uuid1,uuid2,uuid3"
function isAuthorizedAdmin(userId: string): boolean {
  const allowedAdmins = process.env.ADMIN_REACTIVATION_ADMINS?.split(',').map(s => s.trim()) ?? [];
  return allowedAdmins.includes(userId);
}

// Simple in-memory rate limiting (per admin user)
const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max 10 reactivations per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const current = RATE_LIMITS.get(adminId);

  if (!current || now > current.resetAt) {
    RATE_LIMITS.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count++;
  return true;
}

function verifyAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_REACTIVATION_SECRET;

  if (!expectedSecret) {
    console.error('[Admin Reactivation] ADMIN_REACTIVATION_SECRET not configured');
    return false;
  }

  return secret === expectedSecret;
}

/**
 * Admin endpoint to reactivate a suspended user account.
 *
 * POST /api/admin/account/reactivate
 * Headers: { 'x-admin-secret': 'ADMIN_REACTIVATION_SECRET' }
 * Body: {
 *   userId: string,
 *   reason: string,        // Required: reason for reactivation (e.g., "goodwill", "payment_received", "error_correction")
 *   description?: string   // Optional: detailed explanation
 * }
 *
 * Security:
 * - Requires valid NextAuth session
 * - User must be in AUTHORIZED_ADMIN_IDS whitelist
 * - Requires x-admin-secret header matching ADMIN_REACTIVATION_SECRET env var
 * - Rate limited: max 10 reactivations per hour per admin
 *
 * This:
 * 1. Logs the reactivation with audit trail
 * 2. Notifies the gateway to restore API access
 * 3. Sends email notification to user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin user
    const adminUser = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, session.user.email))
      .then(rows => rows[0]);

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 401 });
    }

    // Check 1: Admin must be in explicit whitelist
    if (!isAuthorizedAdmin(adminUser.id)) {
      console.warn(`[Admin Reactivation] Unauthorized attempt by ${adminUser.email} (${adminUser.id})`);
      return NextResponse.json({ error: 'Forbidden - Not in admin whitelist' }, { status: 403 });
    }

    // Check 2: Additional secret required
    if (!verifyAdminSecret(request)) {
      console.warn(`[Admin Reactivation] Invalid secret from ${adminUser.email}`);
      return NextResponse.json({ error: 'Forbidden - Invalid admin secret' }, { status: 403 });
    }

    // Check 3: Rate limiting
    if (!checkRateLimit(adminUser.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded - max 10 reactivations per hour' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { userId, reason, description } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Missing reason parameter' },
        { status: 400 }
      );
    }

    // Valid reasons
    const validReasons = ['goodwill', 'payment_received', 'error_correction', 'fraud_verified', 'manual_review'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    // Get target user and their pledge
    const targetUser = await db
      .select({
        id: user.id,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, userId))
      .then(rows => rows[0]);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check 4: Verify the target account is actually suspended (canceled or past_due)
    const userPledge = await db
      .select({
        id: pledge.id,
        status: pledge.status,
        stripeCustomerId: pledge.stripeCustomerId,
      })
      .from(pledge)
      .where(
        and(
          eq(pledge.userId, userId),
          eq(pledge.status, 'canceled')
        )
      )
      .orderBy(pledge.updatedAt)
      .limit(1)
      .then(rows => rows[0]);

    // Also check for past_due status
    const pastDuePledge = await db
      .select({
        id: pledge.id,
        status: pledge.status,
        stripeCustomerId: pledge.stripeCustomerId,
      })
      .from(pledge)
      .where(
        and(
          eq(pledge.userId, userId),
          eq(pledge.status, 'past_due')
        )
      )
      .orderBy(pledge.updatedAt)
      .limit(1)
      .then(rows => rows[0]);

    const activePledge = userPledge || pastDuePledge;

    if (!activePledge) {
      console.warn(`[Admin Reactivation] Attempt to reactivate non-suspended user ${userId} by ${adminUser.email}`);
      return NextResponse.json(
        { error: 'Cannot reactivate - user does not have a suspended pledge (canceled or past_due)' },
        { status: 400 }
      );
    }

    const previousStatus = activePledge.status;

    // Log the reactivation in audit table
    const [reactivationRecord] = await db
      .insert(accountReactivation)
      .values({
        userId: targetUser.id,
        adminUserId: adminUser.id,
        reason,
        description: description ?? null,
        previousStatus,
        notificationSent: false,
        gatewaySynced: false,
      })
      .returning();

    // Notify gateway to reactivate the account
    let gatewaySynced = false;
    try {
      await notifyGateway({
        principal_id: userId,
        account_id: activePledge?.stripeCustomerId ?? userId,
        status: 'active',
        reason: 'manual_reactivation',
      });
      gatewaySynced = true;
    } catch (error) {
      console.error('Failed to notify gateway of reactivation:', error);
      // Continue - we'll return a warning but the audit record is created
    }

    // Send email notification to user
    let notificationSent = false;
    try {
      await sendAccountReactivatedEmail(targetUser.email, {
        adminName: session.user.name ?? undefined,
        reason: reason.replace('_', ' '),
        description: description ?? undefined,
      });
      notificationSent = true;
    } catch (error) {
      console.error('Failed to send reactivation email:', error);
      // Continue - we'll return a warning but the audit record is created
    }

    // Update the audit record with results
    await db
      .update(accountReactivation)
      .set({
        notificationSent,
        gatewaySynced,
      })
      .where(eq(accountReactivation.id, reactivationRecord.id));

    // Build response
    const response: {
      success: boolean;
      message: string;
      reactivationId: string;
      warnings?: string[];
    } = {
      success: true,
      message: `Account for ${targetUser.email} has been reactivated`,
      reactivationId: reactivationRecord.id,
    };

    const warnings: string[] = [];
    if (!gatewaySynced) {
      warnings.push('Gateway notification failed - manual sync may be required');
    }
    if (!notificationSent) {
      warnings.push('Email notification failed');
    }

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in account reactivation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler to list recent reactivations (admin audit log)
 *
 * Security: Same as POST - requires auth, whitelist membership, and admin secret
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin user
    const adminUser = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, session.user.email))
      .then(rows => rows[0]);

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 401 });
    }

    // Check whitelist
    if (!isAuthorizedAdmin(adminUser.id)) {
      console.warn(`[Admin Reactivation] Unauthorized GET attempt by ${adminUser.email} (${adminUser.id})`);
      return NextResponse.json({ error: 'Forbidden - Not in admin whitelist' }, { status: 403 });
    }

    // Check secret
    if (!verifyAdminSecret(request)) {
      console.warn(`[Admin Reactivation] Invalid secret in GET from ${adminUser.email}`);
      return NextResponse.json({ error: 'Forbidden - Invalid admin secret' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    // Build query with conditional where clause before orderBy/limit
    const baseQuery = db
      .select({
        id: accountReactivation.id,
        userId: accountReactivation.userId,
        adminUserId: accountReactivation.adminUserId,
        reason: accountReactivation.reason,
        description: accountReactivation.description,
        previousStatus: accountReactivation.previousStatus,
        notificationSent: accountReactivation.notificationSent,
        gatewaySynced: accountReactivation.gatewaySynced,
        createdAt: accountReactivation.createdAt,
        userEmail: user.email,
      })
      .from(accountReactivation)
      .leftJoin(user, eq(user.id, accountReactivation.userId));

    const query = userId
      ? baseQuery.where(eq(accountReactivation.userId, userId)).orderBy(accountReactivation.createdAt).limit(limit)
      : baseQuery.orderBy(accountReactivation.createdAt).limit(limit);

    const reactivations = await query;

    return NextResponse.json({ reactivations });
  } catch (error) {
    console.error('Error listing reactivations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
