/**
 * Seeded Pseudo-Random Number Generator (PRNG) using Mulberry32.
 * Ensures deterministic, reproducible simulations across runs.
 */
export class SeededPRNG {
  private seed: number;
  private current: number;

  constructor(initialSeed: number | string = 1984) {
    this.seed = typeof initialSeed === 'string' ? this.hashString(initialSeed) : initialSeed;
    this.current = this.seed >>> 0;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash >>> 0;
  }

  public reset(newSeed?: number | string): void {
    if (newSeed !== undefined) {
      this.seed = typeof newSeed === 'string' ? this.hashString(newSeed) : newSeed;
    }
    this.current = this.seed >>> 0;
  }

  public getSeed(): number {
    return this.seed;
  }

  /**
   * Returns a pseudorandom number between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.current += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudorandom integer between min (inclusive) and max (inclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a float with optional Gaussian-like distribution using Box-Muller transform
   */
  public nextGaussian(mean = 0, stdev = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdev + mean;
  }

  /**
   * Randomly pick an item from an array
   */
  public choice<T>(items: T[]): T {
    if (items.length === 0) throw new Error('Cannot choice from empty array');
    return items[this.nextInt(0, items.length - 1)];
  }
}

export const defaultPRNG = new SeededPRNG(4242);
