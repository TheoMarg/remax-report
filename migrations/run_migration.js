/**
 * Run SQL migration against Supabase via pooler connection.
 * Usage: node migrations/run_migration.js migrations/001_v2_views_and_tables.sql
 *
 * Requires: npm install postgres (temp dependency)
 * Connection: Uses pooler (aws-1-eu-central-1.pooler.supabase.com)
 *             because direct DB host is IPv6-only and doesn't work from this machine.
 */

import fs from 'fs';
import postgres from 'postgres';

const MIGRATION_FILE = process.argv[2];
if (!MIGRATION_FILE) {
  console.error('Usage: node migrations/run_migration.js <path-to-sql-file>');
  process.exit(1);
}

// Load .env manually (no dotenv dependency)
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const SUPABASE_DB_PASSWORD = env.SUPABASE_DB_PASSWORD;
if (!SUPABASE_DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD in .env');
  console.error('Add: SUPABASE_DB_PASSWORD=your_database_password');
  process.exit(1);
}

const PROJECT_REF = 'bpumfzwrmmolsilbjqjl';
const POOLER_HOST = 'aws-1-eu-central-1.pooler.supabase.com';
const POOLER_USER = `postgres.${PROJECT_REF}`;

const sql = postgres(`postgresql://${POOLER_USER}:${SUPABASE_DB_PASSWORD}@${POOLER_HOST}:5432/postgres`, {
  ssl: 'require',
});

async function run() {
  const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  console.log(`Running migration: ${MIGRATION_FILE}`);
  console.log(`Connected to pooler: ${POOLER_HOST}`);

  try {
    await sql.unsafe(migrationSql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
