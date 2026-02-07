/**
 * Seed script to create/reset test users for Playwright and E2E testing.
 *
 * Usage: pnpm db:seed-test
 *
 * Creates or resets test accounts:
 *   - Basic:    playwright-test@umans.local / test123
 *   - Code Pro: test-code-pro@umans.local / test123 (with active code_pro pledge)
 *   - Code Max: test-code-max@umans.local / test123 (with active code_max pledge)
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { user, space, spaceToUser, pledge } from './schema';

config({ path: '.env.local' });

const TEST_PASSWORD = 'test123';

type TestUserConfig = {
  email: string;
  plan?: 'code_pro' | 'code_max';
  billingCycle?: 'monthly' | 'yearly';
};

const TEST_USERS: TestUserConfig[] = [
  { email: 'playwright-test@umans.local' },
  { email: 'test-code-pro@umans.local', plan: 'code_pro', billingCycle: 'monthly' },
  { email: 'test-code-max@umans.local', plan: 'code_max', billingCycle: 'yearly' },
];

async function createOrUpdateUser(
  db: ReturnType<typeof drizzle>,
  config: TestUserConfig,
): Promise<string> {
  const { email, plan, billingCycle } = config;

  // Check if user already exists
  const existingUsers = await db.select().from(user).where(eq(user.email, email));

  const salt = genSaltSync(10);
  const hashedPassword = hashSync(TEST_PASSWORD, salt);

  let userId: string;

  if (existingUsers.length > 0) {
    // Update existing user
    await db
      .update(user)
      .set({
        password: hashedPassword,
        emailVerified: new Date(),
      })
      .where(eq(user.email, email));

    userId = existingUsers[0].id;
    console.log(`  ✅ Updated user: ${email}`);
  } else {
    // Create new user
    const [newUser] = await db
      .insert(user)
      .values({
        email,
        password: hashedPassword,
        emailVerified: new Date(),
        hasCompletedOnboarding: true,
      })
      .returning();

    userId = newUser.id;
    console.log(`  ✅ Created user: ${email}`);
  }

  // Ensure user has a default space
  const existingSpaceLink = await db
    .select({ spaceId: spaceToUser.spaceId })
    .from(spaceToUser)
    .where(eq(spaceToUser.userId, userId))
    .limit(1);

  if (existingSpaceLink.length === 0) {
    const [newSpace] = await db
      .insert(space)
      .values({
        name: 'Default Space',
        isDefault: true,
      })
      .returning();

    await db.insert(spaceToUser).values({
      userId,
      spaceId: newSpace.id,
    });

    await db.update(user).set({ selectedSpaceId: newSpace.id }).where(eq(user.id, userId));

    console.log(`     └─ Created default space`);
  }

  // Create pledge if plan is specified
  if (plan && billingCycle) {
    const existingPledge = await db
      .select()
      .from(pledge)
      .where(eq(pledge.userId, userId))
      .orderBy(pledge.createdAt)
      .limit(1);

    if (existingPledge.length === 0) {
      await db.insert(pledge).values({
        userId,
        email,
        plan,
        billingCycle,
        status: 'active',
        checkoutSessionId: `seeded_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      });

      console.log(`     └─ Created ${plan} pledge (${billingCycle})`);
    } else {
      // Update existing pledge to active
      await db
        .update(pledge)
        .set({
          status: 'active',
          plan,
          billingCycle,
        })
        .where(eq(pledge.id, existingPledge[0].id));

      console.log(`     └─ Updated pledge: ${plan} (${billingCycle})`);
    }
  }

  return userId;
}

async function seedTestUsers() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('🌱 Seeding test users...\n');

  try {
    for (const testUser of TEST_USERS) {
      await createOrUpdateUser(db, testUser);
    }

    console.log('\n📋 Test credentials:');
    console.log('─────────────────────────────────────────────────────');
    for (const testUser of TEST_USERS) {
      const planLabel = testUser.plan ? ` [${testUser.plan}]` : ' [basic user]';
      console.log(`   ${testUser.email}${planLabel}`);
    }
    console.log('   Password: test123');
    console.log('─────────────────────────────────────────────────────');
    console.log('\n💡 Code offer dashboard: http://localhost:3000/billing');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to seed test users:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }

  process.exit(0);
}

seedTestUsers();
