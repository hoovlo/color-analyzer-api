export interface ColorReadingInput {
  device_id: string;
  r: number;
  g: number;
  b: number;
  notes?: string;
  sample_name?: string;
}

export interface ColorReading {
  id: number;
  device_id: string;
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
  notes: string | null;
  sample_name: string | null;
  delta_e: number | null;
}

export interface ColorComparison {
  reading1: ColorReading;
  reading2: ColorReading;
  delta_e: number;
}
