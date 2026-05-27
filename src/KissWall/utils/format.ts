// Small utilities used across the game.

let _idCounter = 0;
/** Cheap monotonic id (per session). Not cryptographic. */
export function nextId(prefix = ''): string {
  _idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${_idCounter.toString(36)}`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

export function uuidLike(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try { return crypto.randomUUID(); } catch { /* fall through */ }
  }
  return nextId('id-');
}

/** Compute centroid + scatter of kiss positions in nx/ny space. */
export function kissStats(kisses: { nx: number; ny: number }[]): {
  cx: number; cy: number; spread: number;
} {
  if (kisses.length === 0) return { cx: 0.5, cy: 0.5, spread: 0 };
  let sx = 0, sy = 0;
  for (const k of kisses) { sx += k.nx; sy += k.ny; }
  const cx = sx / kisses.length;
  const cy = sy / kisses.length;
  let s2 = 0;
  for (const k of kisses) {
    const dx = k.nx - cx, dy = k.ny - cy;
    s2 += dx * dx + dy * dy;
  }
  return { cx, cy, spread: Math.sqrt(s2 / kisses.length) };
}

export function describeDistribution(kisses: { nx: number; ny: number }[]): string {
  const { cy, spread } = kissStats(kisses);
  let where: string;
  if (cy < 0.34) where = 'upper third';
  else if (cy > 0.66) where = 'lower third';
  else where = 'middle';
  const dense = spread < 0.18 ? 'concentrated' : spread < 0.28 ? 'gathered' : 'scattered';
  return `${dense} on the ${where}`;
}
