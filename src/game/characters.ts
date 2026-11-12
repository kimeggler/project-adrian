/**
 * Playable heroes (CB-9, LP-5). Pure data, no Phaser, so the landing page,
 * the save and the game share it.
 *
 * Stat differences are small on purpose, and none of them make jumps shorter
 * or lower: the level generator only guarantees reachability for the default
 * jump (see levelgen/reachability).
 */
import { HEALTH } from "./config";
import { KNIGHT_LOOK, PALADIN_LOOK, RANGER_LOOK, type HeroLook } from "./art/sprites";

export type CharacterId = "knight" | "ranger" | "paladin";

export interface CharacterStats {
  /** Hearts per life (the HUD shows this many). */
  heartsPerLife: number;
  /** Multiplier on the run speed. Never below 1 (see above). */
  runSpeed: number;
  /** Multiplier on the sword cooldown (> 1 = slower swings). */
  swordCooldown: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** One line for the character select card. */
  blurb: string;
  look: HeroLook;
  stats: CharacterStats;
  /** Unlocked once the player has reached this level (1 = from the start). */
  unlockLevel: number;
}

export const DEFAULT_CHARACTER: CharacterId = "knight";

export const CHARACTERS: readonly Character[] = [
  {
    id: "knight",
    name: "Knight",
    blurb: "Well-rounded. 3 hearts.",
    look: KNIGHT_LOOK,
    stats: { heartsPerLife: HEALTH.HEARTS_PER_LIFE, runSpeed: 1, swordCooldown: 1 },
    unlockLevel: 1,
  },
  {
    id: "ranger",
    name: "Ranger",
    blurb: "Runs faster. Only 2 hearts.",
    look: RANGER_LOOK,
    stats: { heartsPerLife: 2, runSpeed: 1.15, swordCooldown: 1 },
    unlockLevel: 3,
  },
  {
    id: "paladin",
    name: "Paladin",
    blurb: "4 hearts. Slower sword.",
    look: PALADIN_LOOK,
    stats: { heartsPerLife: 4, runSpeed: 1, swordCooldown: 1.4 },
    unlockLevel: 6,
  },
];

export function isCharacterId(id: unknown): id is CharacterId {
  return CHARACTERS.some((c) => c.id === id);
}

export function getCharacter(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** Ids of every hero unlocked by reaching `highestLevel`. */
export function unlockedByLevel(highestLevel: number): CharacterId[] {
  return CHARACTERS.filter((c) => c.unlockLevel <= Math.max(1, highestLevel)).map((c) => c.id);
}
