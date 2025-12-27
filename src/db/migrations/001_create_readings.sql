-- Create the color_readings table
CREATE TABLE IF NOT EXISTS color_readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- RGB values (input from app)
    r INTEGER NOT NULL CHECK (r >= 0 AND r <= 255),
    g INTEGER NOT NULL CHECK (g >= 0 AND g <= 255),
    b INTEGER NOT NULL CHECK (b >= 0 AND b <= 255),

    -- Derived color values (calculated server-side)
    hex VARCHAR(7) NOT NULL,
    hue DECIMAL(6,2),
    saturation_l DECIMAL(6,2),
    lightness DECIMAL(6,2),
    saturation_v DECIMAL(6,2),
    value DECIMAL(6,2),
    lab_l DECIMAL(6,2),
    lab_a DECIMAL(6,2),
    lab_b DECIMAL(6,2),

    -- Metadata
    notes TEXT,
    sample_name VARCHAR(255),

    -- Delta E from previous reading for this device (null for first reading)
    delta_e DECIMAL(6,2)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_readings_device ON color_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON color_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_device_timestamp ON color_readings(device_id, timestamp DESC);
