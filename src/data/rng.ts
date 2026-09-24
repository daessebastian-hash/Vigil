/** Small deterministic PRNG helpers so the simulated history is stable across reloads. */

export type Rng = () => number;

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(key: string): Rng {
  return mulberry32(hashString(key));
}

/** Standard normal sample (Box–Muller). */
export function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
