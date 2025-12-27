import { Pool } from 'pg';

let pool: Pool | null = null;
let isConnected = false;

// Lazy connection - only create pool when needed
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('Creating database pool...');

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      isConnected = false;
    });
  }

  return pool;
}

// Test connection with retry
export async function ensureConnection(retries = 5, delay = 2000): Promise<boolean> {
  if (isConnected) return true;

  const pool = getPool();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connected successfully');
      isConnected = true;
      return true;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt < retries) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return false;
}

// Run migrations
export async function runMigrations(): Promise<void> {
  const pool = getPool();

  console.log('Running database migrations...');

  // Create lab_samples table first
  const createLabSamplesSQL = `
    CREATE TABLE IF NOT EXISTS lab_samples (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_samples_device ON lab_samples(device_id);
    CREATE INDEX IF NOT EXISTS idx_samples_created ON lab_samples(created_at DESC);
  `;

  // Create color_readings table with sample_id foreign key
  const createReadingsSQL = `
    CREATE TABLE IF NOT EXISTS color_readings (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        sample_id INTEGER REFERENCES lab_samples(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        r INTEGER NOT NULL CHECK (r >= 0 AND r <= 255),
        g INTEGER NOT NULL CHECK (g >= 0 AND g <= 255),
        b INTEGER NOT NULL CHECK (b >= 0 AND b <= 255),
        hex VARCHAR(7) NOT NULL,
        hue DECIMAL(6,2),
        saturation_l DECIMAL(6,2),
        lightness DECIMAL(6,2),
        saturation_v DECIMAL(6,2),
        value DECIMAL(6,2),
        lab_l DECIMAL(6,2),
        lab_a DECIMAL(6,2),
        lab_b DECIMAL(6,2),
        delta_e DECIMAL(6,2)
    );

    CREATE INDEX IF NOT EXISTS idx_readings_device ON color_readings(device_id);
    CREATE INDEX IF NOT EXISTS idx_readings_sample ON color_readings(sample_id);
    CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON color_readings(timestamp DESC);
  `;

  // Add sample_id column if table exists but column doesn't
  const addSampleIdSQL = `
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'color_readings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'color_readings' AND column_name = 'sample_id') THEN
          ALTER TABLE color_readings ADD COLUMN sample_id INTEGER REFERENCES lab_samples(id) ON DELETE CASCADE;
          CREATE INDEX IF NOT EXISTS idx_readings_sample ON color_readings(sample_id);
        END IF;
      END IF;
    END $$;
  `;

  try {
    await pool.query(createLabSamplesSQL);
    await pool.query(createReadingsSQL);
    await pool.query(addSampleIdSQL);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export default { getPool, ensureConnection, runMigrations };
