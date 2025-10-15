import { Kysely } from 'kysely';
import { createId } from '@paralleldrive/cuid2';

export async function up(db: Kysely<any>): Promise<void> {
  // Insert demo user
  const demoUserId = createId();
  await db
    .insertInto('user')
    .values({
      id: demoUserId,
      email: 'demo@farsquare.xyz',
      name: 'Demo User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  // Insert demo account with hashed password
  await db
    .insertInto('account')
    .values({
      id: createId(),
      userId: demoUserId,
      accountId: 'demo@farsquare.xyz',
      providerId: 'credential',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LEsBpEw5jKsYXpQG', // Pre-hashed bcrypt password for "demo123"
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove demo data in reverse order
  await db
    .deleteFrom('account')
    .where('account.accountId', '=', 'demo@farsquare.xyz')
    .execute();

  await db
    .deleteFrom('user')
    .where('user.email', '=', 'demo@farsquare.xyz')
    .execute();
}
