import { Router, Request, Response } from 'express';
import { getPool } from '../db/connection';
import { LabSample, LabSampleInput } from '../types/ColorReading';

const router = Router();

// POST /api/samples - Create a new lab sample
router.post('/', async (req: Request, res: Response) => {
  try {
    const { device_id, name, notes }: LabSampleInput = req.body;

    if (!device_id || !name) {
      res.status(400).json({ error: 'Missing required fields: device_id, name' });
      return;
    }

    const pool = getPool();
    const result = await pool.query<LabSample>(
      `INSERT INTO lab_samples (device_id, name, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [device_id, name.trim(), notes?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sample:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/samples - Get all samples for a device
router.get('/', async (req: Request, res: Response) => {
  try {
    const { device_id } = req.query;

    if (!device_id) {
      res.status(400).json({ error: 'device_id query parameter is required' });
      return;
    }

    const pool = getPool();
    const result = await pool.query<LabSample>(
      `SELECT s.*,
              (SELECT COUNT(*) FROM color_readings r WHERE r.sample_id = s.id) as reading_count
       FROM lab_samples s
       WHERE s.device_id = $1
       ORDER BY s.created_at DESC`,
      [device_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/samples/:id - Get a single sample with its readings
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();

    // Get the sample
    const sampleResult = await pool.query<LabSample>(
      'SELECT * FROM lab_samples WHERE id = $1',
      [id]
    );

    if (sampleResult.rows.length === 0) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    // Get all readings for this sample
    const readingsResult = await pool.query(
      `SELECT * FROM color_readings
       WHERE sample_id = $1
       ORDER BY timestamp ASC`,
      [id]
    );

    res.json({
      ...sampleResult.rows[0],
      readings: readingsResult.rows
    });
  } catch (error) {
    console.error('Error fetching sample:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/samples/:id - Update a sample
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const pool = getPool();
    const result = await pool.query<LabSample>(
      `UPDATE lab_samples
       SET name = $1, notes = $2
       WHERE id = $3
       RETURNING *`,
      [name.trim(), notes?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/samples/:id - Delete a sample (cascade deletes readings)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM lab_samples WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    res.json({ message: 'Sample and all its readings deleted successfully', id: Number(id) });
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
