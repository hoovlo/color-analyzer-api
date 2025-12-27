// Lab Sample types
export interface LabSampleInput {
  device_id: string;
  name: string;
  notes?: string;
}

export interface LabSample {
  id: number;
  device_id: string;
  name: string;
  notes: string | null;
  created_at: Date;
}

// Color Reading types
export interface ColorReadingInput {
  device_id: string;
  sample_id: number;
  r: number;
  g: number;
  b: number;
}

export interface ColorReading {
  id: number;
  device_id: string;
  sample_id: number | null;
  timestamp: Date;
  r: number;
  g: number;
  b: number;
  hex: string;
  hue: number;
  saturation_l: number;
  lightness: number;
  saturation_v: number;
  value: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  delta_e: number | null;
}

export interface ColorReadingWithSample extends ColorReading {
  sample_name?: string;
  sample_notes?: string;
}

export interface ColorComparison {
  reading1: ColorReading;
  reading2: ColorReading;
  delta_e: number;
}
