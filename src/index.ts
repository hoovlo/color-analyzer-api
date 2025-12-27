import express from 'express';
import cors from 'cors';
import { ensureConnection, runMigrations } from './db/connection';
import readingsRouter from './routes/readings';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (doesn't require DB)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/readings', readingsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with database initialization
async function start() {
  console.log('Starting server...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  // Start the server first (Railway expects quick startup)
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  // Then try to connect to database and run migrations
  if (process.env.DATABASE_URL) {
    try {
      const connected = await ensureConnection(10, 3000); // 10 retries, 3s delay
      if (connected) {
        await runMigrations();
        console.log('Database ready');
      } else {
        console.error('Failed to connect to database after retries');
      }
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  } else {
    console.warn('DATABASE_URL not set - running without database');
  }
}

start().catch(console.error);

export default app;
