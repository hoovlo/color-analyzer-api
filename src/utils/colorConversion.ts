// Color conversion utilities for RGB to various color spaces

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface LAB {
  l: number; // 0-100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

// RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360 * 100) / 100,
    s: Math.round(s * 100 * 100) / 100,
    l: Math.round(l * 100 * 100) / 100
  };
}

// RGB to HSV
export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  let h = 0;
  let s = 0;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360 * 100) / 100,
    s: Math.round(s * 100 * 100) / 100,
    v: Math.round(v * 100 * 100) / 100
  };
}

// RGB to XYZ (using D65 illuminant)
export function rgbToXyz(r: number, g: number, b: number): XYZ {
  // Normalize RGB values
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  // Apply gamma correction (sRGB)
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  // Scale to 0-100
  rn *= 100;
  gn *= 100;
  bn *= 100;

  // Convert to XYZ using D65 illuminant matrix
  return {
    x: rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375,
    y: rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750,
    z: rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041
  };
}

// XYZ to LAB (using D65 illuminant)
export function xyzToLab(xyz: XYZ): LAB {
  // D65 illuminant reference values
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;

  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.pow(x, 1/3) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.pow(y, 1/3) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.pow(z, 1/3) : (kappa * z + 16) / 116;

  return {
    l: Math.round((116 * y - 16) * 100) / 100,
    a: Math.round((500 * (x - y)) * 100) / 100,
    b: Math.round((200 * (y - z)) * 100) / 100
  };
}

// RGB to LAB
export function rgbToLab(r: number, g: number, b: number): LAB {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz);
}

// Calculate Delta E (CIE76) - perceptual color difference
export function deltaE76(lab1: LAB, lab2: LAB): number {
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  return Math.round(Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB) * 100) / 100;
}

// Get all color conversions from RGB
export function getAllColorValues(r: number, g: number, b: number) {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  const lab = rgbToLab(r, g, b);

  return {
    hex,
    hue: hsl.h,
    saturation_l: hsl.s,
    lightness: hsl.l,
    saturation_v: hsv.s,
    value: hsv.v,
    lab_l: lab.l,
    lab_a: lab.a,
    lab_b: lab.b
  };
}
