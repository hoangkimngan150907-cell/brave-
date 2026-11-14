import 'dotenv/config';
import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool, db } from './index.ts';

async function runMigrations() {
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  console.log(`Running PostgreSQL migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('PostgreSQL migrations applied successfully.');
}

runMigrations()
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = createPool();
    await pool.end().catch(() => {});
  });
