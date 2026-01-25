/**
 * Seed script to create/reset a test user for Playwright and E2E testing.
 *
 * Usage: pnpm db:seed-test
 *
 * Creates or resets the test account:
 *   Email: playwright-test@umans.local
 *   Password: test123
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { user, space, spaceToUser } from './schema';

config({ path: '.env.local' });

const TEST_EMAIL = 'playwright-test@umans.local';
const TEST_PASSWORD = 'test123';

async function seedTestUser() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('🌱 Seeding test user...');

  try {
    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_EMAIL));

    const salt = genSaltSync(10);
    const hashedPassword = hashSync(TEST_PASSWORD, salt);

    if (existingUsers.length > 0) {
      // Update existing user
      await db
        .update(user)
        .set({
          password: hashedPassword,
          emailVerified: new Date(),
        })
        .where(eq(user.email, TEST_EMAIL));

      console.log(`✅ Updated existing test user: ${TEST_EMAIL}`);
    } else {
      // Create new user
      const [newUser] = await db
        .insert(user)
        .values({
          email: TEST_EMAIL,
          password: hashedPassword,
          emailVerified: new Date(),
          hasCompletedOnboarding: true,
        })
        .returning();

      // Create default space for the user
      const [newSpace] = await db
        .insert(space)
        .values({
          name: 'Default Space',
          isDefault: true,
        })
        .returning();

      // Link user to space
      await db.insert(spaceToUser).values({
        userId: newUser.id,
        spaceId: newSpace.id,
      });

      // Set as selected space
      await db
        .update(user)
        .set({ selectedSpaceId: newSpace.id })
        .where(eq(user.id, newUser.id));

      console.log(`✅ Created new test user: ${TEST_EMAIL}`);
    }

    console.log('');
    console.log('📋 Test credentials:');
    console.log(`   Email:    ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to seed test user:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }

  process.exit(0);
}

seedTestUser();
