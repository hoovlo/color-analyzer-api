import fs from 'fs';
import path from 'path';
import pool from './connection';

async function runMigrations() {
  console.log('Running database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await pool.query(sql);
      console.log(`Migration ${file} completed successfully`);
    } catch (error) {
      console.error(`Migration ${file} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
