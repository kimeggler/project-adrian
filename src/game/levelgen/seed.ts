import { LEVELGEN } from "../config";
import { hash32 } from "./rng";

/** Parse a seed from user input (e.g. the ?seed= URL parameter). */
export function parseSeed(value: string | null | undefined): number | undefined {
  if (!value || !/^\d{1,10}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= 0 && n <= 0xffffffff ? n : undefined;
}

/**
 * A fresh seed for a new run. This is the only place randomness from
 * Math.random() is allowed: picking *which* seed to play, not generating.
 */
export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * LEVELGEN.MAX_RANDOM_SEED);
}

/** Seed of the level after the one with `seed`. Short numbers, easy to share. */
export function nextSeed(seed: number): number {
  return 1 + (hash32(seed + 0x9e3779b9) % LEVELGEN.MAX_RANDOM_SEED);
}
