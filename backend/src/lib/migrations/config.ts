import * as path from 'path';
import { promises as fs } from 'fs';
import { Migrator, FileMigrationProvider } from 'kysely';
import { getDatabasePool } from '../database';

/**
 * Migration folder path - points to the migrations directory
 * This should be relative to the config file location
 * Path: src/lib/migrations/config.ts -> src/migrations/
 */
export const migrationFolder = path.join(__dirname, '../../migrations');

/**
 * Kysely migrator instance configured for the authentication database
 * Enables database schema evolution with proper error handling and team collaboration features
 */
export const migrator = new Migrator({
  db: getDatabasePool(),
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
  // Allow unordered migrations for team collaboration
  // This enables developers to work on migrations independently without strict ordering
  allowUnorderedMigrations: true,
});
