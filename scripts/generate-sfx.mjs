#!/usr/bin/env node
/**
 * Generates the game's sound effects with jsfxr (AU-1) into public/audio/.
 *
 *   npm run sfx
 *
 * jsfxr presets use Math.random(); we replace it with a seeded PRNG while
 * generating, so the same seeds always produce the same .wav files.
 * To change a sound: try other seeds / overrides, run the script, listen.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sfxr } from "jsfxr";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");

/** Same mulberry32 as the level generator. */
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * name → [jsfxr preset, seed, parameter overrides].
 * Keys must match SfxKey in src/game/systems/Audio.ts.
 */
const SOUNDS = {
  jump: ["jump", 11, { p_env_decay: 0.18 }],
  land: ["hitHurt", 7, { wave_type: 3, p_base_freq: 0.12, p_freq_ramp: -0.2, p_env_sustain: 0.04, p_env_decay: 0.18, sound_vol: 0.15 }],
  coin: ["pickupCoin", 3, {}],
  hurt: ["hitHurt", 21, {}],
  death: ["explosion", 5, { p_env_decay: 0.3 }],
  checkpoint: ["powerUp", 8, { p_env_decay: 0.2 }],
  levelComplete: ["powerUp", 42, { p_env_sustain: 0.35, p_env_decay: 0.4, p_arp_mod: 0.45, p_arp_speed: 0.55 }],
  menuSelect: ["blipSelect", 2, {}],
};

const COMMON = { sound_vol: 0.25, sample_rate: 44100, sample_size: 16 };

mkdirSync(OUT_DIR, { recursive: true });
const realRandom = Math.random;
try {
  for (const [name, [preset, seed, overrides]] of Object.entries(SOUNDS)) {
    Math.random = mulberry32(seed);
    const params = { ...sfxr.generate(preset), ...COMMON, ...overrides };
    const wave = sfxr.toWave(params);
    const file = join(OUT_DIR, `${name}.wav`);
    writeFileSync(file, Buffer.from(wave.wav));
    console.log(`${name.padEnd(14)} ${preset.padEnd(11)} seed ${String(seed).padEnd(3)} → ${file} (${wave.wav.length} bytes)`);
  }
} finally {
  Math.random = realRandom;
}
