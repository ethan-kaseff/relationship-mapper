function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}

/**
 * Returns an error string if the color is too close to reserved seat colors:
 *   Purple (230–325°) = guest seats
 *   Amber/yellow (20–70°) = placeholder seats
 */
export function reservedColorError(hex: string): string | null {
  const hue = hexToHue(hex);
  if (hue >= 230 && hue <= 325) {
    return "Too similar to guest seat color (purple/violet). Choose a color in the red, green, blue, or teal range.";
  }
  if (hue >= 20 && hue <= 70) {
    return "Too similar to placeholder seat color (amber/yellow). Choose a color in the red, green, blue, or teal range.";
  }
  return null;
}
