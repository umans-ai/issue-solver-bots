import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

export type UserGatewayApiKey = {
  gatewayKeyId: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

async function getDb() {
  const mod = await import('../db');
  return mod.db;
}

async function getSchema() {
  return await import('../db/schema');
}

export async function listUserGatewayApiKeys(
  userId: string,
): Promise<Array<UserGatewayApiKey>> {
  const db = await getDb();
  const { gatewayApiKey } = await getSchema();

  const rows = await db
    .select()
    .from(gatewayApiKey)
    .where(eq(gatewayApiKey.userId, userId))
    .orderBy(desc(gatewayApiKey.createdAt));

  return rows.map((row: any) => ({
    gatewayKeyId: row.gatewayKeyId as string,
    keyPrefix: row.keyPrefix as string,
    createdAt: toIso(row.createdAt),
    revokedAt: row.revokedAt ? toIso(row.revokedAt) : null,
  }));
}

export async function getUserGatewayApiKeyByGatewayId(
  userId: string,
  gatewayKeyId: string,
) {
  const db = await getDb();
  const { gatewayApiKey } = await getSchema();

  const [row] = await db
    .select()
    .from(gatewayApiKey)
    .where(
      and(
        eq(gatewayApiKey.userId, userId),
        eq(gatewayApiKey.gatewayKeyId, gatewayKeyId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function createUserGatewayApiKeyMetadata({
  userId,
  gatewayKeyId,
  keyPrefix,
}: {
  userId: string;
  gatewayKeyId: string;
  keyPrefix: string;
}) {
  const db = await getDb();
  const { gatewayApiKey } = await getSchema();

  const [row] = await db
    .insert(gatewayApiKey)
    .values({
      userId,
      gatewayKeyId,
      keyPrefix,
    })
    .returning();

  return row;
}

export async function markUserGatewayApiKeyRevoked({
  userId,
  gatewayKeyId,
  revokedAt = new Date(),
}: {
  userId: string;
  gatewayKeyId: string;
  revokedAt?: Date;
}) {
  const db = await getDb();
  const { gatewayApiKey } = await getSchema();

  const [row] = await db
    .update(gatewayApiKey)
    .set({
      revokedAt,
    })
    .where(
      and(
        eq(gatewayApiKey.userId, userId),
        eq(gatewayApiKey.gatewayKeyId, gatewayKeyId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function getLatestPledgeForUser(userId: string) {
  const db = await getDb();
  const { pledge } = await getSchema();

  const [row] = await db
    .select()
    .from(pledge)
    .where(eq(pledge.userId, userId))
    .orderBy(desc(pledge.createdAt))
    .limit(1);

  return row ?? null;
}
