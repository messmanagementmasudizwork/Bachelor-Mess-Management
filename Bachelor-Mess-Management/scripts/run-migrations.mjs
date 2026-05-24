import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL: https://xxxxx.supabase.co => xxxxx
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
console.log(`Project ref: ${projectRef}`);

const migrations = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '003_functions_triggers.sql',
];

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Try direct connection using service role key as password (JWT auth)
const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: serviceRoleKey,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function runMigrations() {
  try {
    console.log('Connecting to Supabase Postgres...');
    await client.connect();
    console.log('Connected successfully!\n');

    for (const file of migrations) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running migration: ${file}`);
      try {
        await client.query(sql);
        console.log(`  ✓ ${file} completed\n`);
      } catch (err) {
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate key')
        ) {
          console.log(`  ⚠ ${file} — some objects already exist, skipping\n`);
        } else {
          console.error(`  ✗ ${file} failed: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('All migrations completed successfully!');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
