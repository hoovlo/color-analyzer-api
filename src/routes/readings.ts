import { Router, Request, Response } from 'express';
import { getPool } from '../db/connection';
import { getAllColorValues, deltaE76, rgbToLab } from '../utils/colorConversion';
import { ColorReadingInput, ColorReading } from '../types/ColorReading';

const router = Router();

// POST /api/readings - Create a new color reading
router.post('/', async (req: Request, res: Response) => {
  try {
    const { device_id, r, g, b, notes, sample_name }: ColorReadingInput = req.body;

    // Validate input
    if (!device_id || r === undefined || g === undefined || b === undefined) {
      res.status(400).json({ error: 'Missing required fields: device_id, r, g, b' });
      return;
    }

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      res.status(400).json({ error: 'RGB values must be between 0 and 255' });
      return;
    }

    const pool = getPool();

    // Calculate all color values
    const colorValues = getAllColorValues(r, g, b);
    const currentLab = rgbToLab(r, g, b);

    // Get the previous reading for this device to calculate delta E
    const prevResult = await pool.query<ColorReading>(
      `SELECT lab_l, lab_a, lab_b FROM color_readings
       WHERE device_id = $1
       ORDER BY timestamp DESC LIMIT 1`,
      [device_id]
    );

    let delta_e: number | null = null;
    if (prevResult.rows.length > 0) {
      const prevLab = {
        l: Number(prevResult.rows[0].lab_l),
        a: Number(prevResult.rows[0].lab_a),
        b: Number(prevResult.rows[0].lab_b)
      };
      delta_e = deltaE76(currentLab, prevLab);
    }

    // Insert the new reading
    const result = await pool.query<ColorReading>(
      `INSERT INTO color_readings
       (device_id, r, g, b, hex, hue, saturation_l, lightness, saturation_v, value, lab_l, lab_a, lab_b, notes, sample_name, delta_e)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        device_id, r, g, b,
        colorValues.hex,
        colorValues.hue,
        colorValues.saturation_l,
        colorValues.lightness,
        colorValues.saturation_v,
        colorValues.value,
        colorValues.lab_l,
        colorValues.lab_a,
        colorValues.lab_b,
        notes || null,
        sample_name || null,
        delta_e
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/readings - Get all readings for a device
router.get('/', async (req: Request, res: Response) => {
  try {
    const { device_id, limit = 100, offset = 0 } = req.query;

    if (!device_id) {
      res.status(400).json({ error: 'device_id query parameter is required' });
      return;
    }

    const pool = getPool();
    const result = await pool.query<ColorReading>(
      `SELECT * FROM color_readings
       WHERE device_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [device_id, Number(limit), Number(offset)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/readings/:id - Get a single reading
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();
    const result = await pool.query<ColorReading>(
      'SELECT * FROM color_readings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Reading not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/readings/:id - Delete a reading
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM color_readings WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Reading not found' });
      return;
    }

    res.json({ message: 'Reading deleted successfully', id: Number(id) });
  } catch (error) {
    console.error('Error deleting reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/readings/compare/:id1/:id2 - Compare two readings
router.get('/compare/:id1/:id2', async (req: Request, res: Response) => {
  try {
    const { id1, id2 } = req.params;

    const pool = getPool();
    const result = await pool.query<ColorReading>(
      'SELECT * FROM color_readings WHERE id IN ($1, $2)',
      [id1, id2]
    );

    if (result.rows.length !== 2) {
      res.status(404).json({ error: 'One or both readings not found' });
      return;
    }

    const reading1 = result.rows.find(r => r.id === Number(id1))!;
    const reading2 = result.rows.find(r => r.id === Number(id2))!;

    const lab1 = { l: Number(reading1.lab_l), a: Number(reading1.lab_a), b: Number(reading1.lab_b) };
    const lab2 = { l: Number(reading2.lab_l), a: Number(reading2.lab_a), b: Number(reading2.lab_b) };

    const delta_e = deltaE76(lab1, lab2);

    res.json({
      reading1,
      reading2,
      delta_e,
      interpretation: getDeltaEInterpretation(delta_e)
    });
  } catch (error) {
    console.error('Error comparing readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to interpret Delta E values
function getDeltaEInterpretation(deltaE: number): string {
  if (deltaE < 1) return 'Not perceptible by human eyes';
  if (deltaE < 2) return 'Perceptible through close observation';
  if (deltaE < 3.5) return 'Perceptible at a glance';
  if (deltaE < 5) return 'Pair colors more similar than different';
  if (deltaE < 10) return 'Pair colors more different than similar';
  return 'Completely different colors';
}

export default router;
