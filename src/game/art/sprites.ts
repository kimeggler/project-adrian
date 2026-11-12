/**
 * Original pixel art for Little Knight, drawn by hand as text.
 * One character = one pixel; "." is transparent; other characters map to
 * PALETTE. Pure data, no Phaser, so the landing page can render it too.
 *
 * Everything here is original work made for this project (see ASSETS_CREDITS.md).
 */

export type Sprite = readonly string[];

export const PALETTE: Readonly<Record<string, string>> = {
  O: "#222034", // outline
  H: "#9badb7", // steel
  h: "#cbdbfc", // steel highlight
  s: "#847e87", // steel shade
  P: "#d95763", // plume
  p: "#ac3232", // plume shade
  F: "#eec39a", // skin
  B: "#5b6ee1", // tunic
  b: "#3f3f74", // tunic shade
  L: "#8f563b", // leather
  K: "#663931", // boots
  Y: "#fbf236", // gold
  y: "#df7126", // gold shade
  W: "#ffffff", // white
  G: "#6abe30", // grass
  g: "#4b692f", // grass shade
  l: "#99e550", // grass highlight
  D: "#8f563b", // dirt
  d: "#663931", // dirt shade
  e: "#d9a066", // dirt pebble
  R: "#ac3232", // red
  V: "#76428a", // slime
  v: "#45283c", // slime shade
  M: "#d77bba", // slime highlight
};

// ---------------------------------------------------------------------------
// Knight (16×16 frames, facing right)
// ---------------------------------------------------------------------------

const PLUME: Readonly<Record<"rest" | "sway" | "up", readonly string[]>> = {
  rest: ["....PPp.........", "...PPPPp........"],
  sway: ["...PPp..........", "..PPPPp........."],
  up: [".....PPp........", "...PPPPp........"],
} as const;

const HELMET = [
  "....OOOOOOOO....",
  "...OhhHHHHHHO...",
  "...OhHHHHHHHO...",
  "...OHHHHOFFFO...",
  "...OHHHHOFFFO...",
  "...OsHHHHOOOO...",
  "....OssssssO....",
];

/** Eye pixel position inside the visor (row 5, col 11 of the frame). */
const EYE = { row: 5, col: 11 } as const;

const BODY = [
  "....ObBBBBBO....",
  "...ObbBBBBBFO...",
  "....OLLLYLLO....",
  "....ObBBBBBO....",
];

/** Sword arm stretched forward; the blade itself is the SLASH sprite. */
const BODY_ATTACK = [
  "....ObBBBBBO....",
  "...ObbBBBBBBFFOh",
  "....OLLLYLLO....",
  "....ObBBBBBO....",
];

const LEGS = {
  idle: [".....OBO.OBO....", ".....OKO.OKO....", ".....OKKOOKKO..."],
  strideA: [".....OBO..OBO...", "....OKO....OKO..", "...OKKO....OKKO."],
  pass: [".....OBOOBO.....", ".....OKOOKO.....", "......OKKO......"],
  strideB: ["....OBO..OBO....", "...OKO....OKO...", "..OKKO.....OKKO."],
  tuck: ["....OBOOBO......", "....OKOOKO......", "................"],
  dangle: [".....OBO..OBO...", ".....OKO..OKO...", ".....OKO..OKO..."],
} as const;

interface KnightPose {
  plume: keyof typeof PLUME;
  legs: readonly string[];
  /** Move the upper body up by this many pixels (running bounce). */
  bob?: number;
  /** Move head and body left by this many pixels (recoil when hurt). */
  lean?: number;
  /** Replace the eye pixel (e.g. "W" for a wide, surprised eye). */
  eye?: string;
  body?: readonly string[];
}

/**
 * What makes a hero look different (CB-9): its own head and plume rows (same
 * sizes as the knight's, eye at the same spot) and a color swap for the rest.
 */
export interface HeroLook {
  head: readonly string[];
  plume: Readonly<Record<keyof typeof PLUME, readonly string[]>>;
  /** Palette character → replacement, applied to body and legs. */
  recolor?: Readonly<Record<string, string>>;
}

const recolorRows = (rows: readonly string[], map: Readonly<Record<string, string>> = {}) =>
  rows.map((row) => [...row].map((c) => map[c] ?? c).join(""));

function hero(look: HeroLook, { plume, legs, bob = 0, lean = 0, eye = "O", body = BODY }: KnightPose): Sprite {
  let upper = [...look.plume[plume], ...look.head, ...recolorRows(body, look.recolor)];
  const eyeRow = upper[EYE.row];
  upper[EYE.row] = eyeRow.slice(0, EYE.col) + eye + eyeRow.slice(EYE.col + 1);
  if (lean > 0) upper = upper.map((r) => r.slice(lean) + ".".repeat(lean));
  if (bob > 0) {
    // Shift up and repeat the last body row so there is no gap above the legs.
    upper = [...upper.slice(bob), ...Array(bob).fill(upper[upper.length - 1])];
  }
  return [...upper, ...recolorRows(legs, look.recolor)];
}

/** Animation frames of one hero, in spritesheet order. */
export function heroFrames(look: HeroLook) {
  const f = (pose: KnightPose) => hero(look, pose);
  return {
    idle: [f({ plume: "rest", legs: LEGS.idle }), f({ plume: "sway", legs: LEGS.idle })],
    run: [
      f({ plume: "sway", legs: LEGS.strideA }),
      f({ plume: "sway", legs: LEGS.pass, bob: 1 }),
      f({ plume: "sway", legs: LEGS.strideB }),
      f({ plume: "sway", legs: LEGS.pass, bob: 1 }),
    ],
    jump: [f({ plume: "sway", legs: LEGS.tuck })],
    fall: [f({ plume: "up", legs: LEGS.dangle })],
    hurt: [f({ plume: "up", legs: LEGS.idle, lean: 1, eye: "W" })],
    attack: [f({ plume: "sway", legs: LEGS.strideA, body: BODY_ATTACK })],
  } as const;
}

export type HeroFrames = ReturnType<typeof heroFrames>;

/** The little knight: steel helmet, red plume, blue tunic. */
export const KNIGHT_LOOK: HeroLook = { head: HELMET, plume: PLUME };

/** Ranger: green hood with a yellow feather, brown leather tunic. */
export const RANGER_LOOK: HeroLook = {
  head: [
    "....OOOOOOO.....",
    "...OlGGGGGGO....",
    "..OlGGGGGGGGO...",
    "..OGGGGOFFFFO...",
    "..OgGGGOFFFFO...",
    "..OggGGGOOOOO...",
    "...OgggggggO....",
  ],
  plume: {
    rest: ["................", "...YYy.........."],
    sway: ["................", "..YYy..........."],
    up: ["................", "....YYy........."],
  },
  recolor: { B: "L", b: "K", L: "K" },
};

/** Paladin: golden helmet with a white crest, white tunic. */
export const PALADIN_LOOK: HeroLook = {
  head: recolorRows(HELMET, { H: "Y", h: "W", s: "y" }),
  plume: {
    rest: ["....WWWh........", "...WWWWWh......."],
    sway: ["...WWWh.........", "..WWWWWh........"],
    up: [".....WWWh.......", "...WWWWWh......."],
  },
  recolor: { B: "W", b: "h" },
};

/** Knight animation frames, in spritesheet order. */
export const KNIGHT_FRAMES = heroFrames(KNIGHT_LOOK);

/**
 * Sword slash in front of the knight (16×9, facing right): the blade plus a
 * swoosh arc. Drawn where the sword hitbox is (see SWORD in config.ts).
 */
export const SLASH: Sprite = [
  "......WWWW......",
  "..........WW....",
  "............W...",
  ".............W..",
  "HHHHHHHHHHHHhWh.",
  "OOOOOOOOOOOOOW..",
  "............W...",
  "..........WW....",
  "......WWWW......",
];

export const KNIGHT_SIZE = 16;

// ---------------------------------------------------------------------------
// Items and hazards
// ---------------------------------------------------------------------------

/** Spinning coin, 8×8, four frames. */
export const COIN_FRAMES: readonly Sprite[] = [
  ["..OOOO..", ".OYYYYO.", "OYYhYyYO", "OYYhYyYO", "OYYhYyYO", "OYYYYyYO", ".OyyyyO.", "..OOOO.."],
  ["...OO...", "..OYYO..", ".OYhYyO.", ".OYhYyO.", ".OYhYyO.", ".OYYyyO.", "..OyyO..", "...OO..."],
  ["...OO...", "...OO...", "...OYO..", "...OYO..", "...OYO..", "...OyO..", "...OO...", "...OO..."],
  ["...OO...", "..OYYO..", ".OYyYhO.", ".OYyYhO.", ".OYyYhO.", ".OyyYYO.", "..OyyO..", "...OO..."],
];

/** Two metal spikes on the bottom half of a 16×16 tile. */
export const SPIKES: Sprite = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...O.......O....",
  "..OhO.....OhO...",
  "..OhO.....OhO...",
  ".OhHsO...OhHsO..",
  ".OhHsO...OhHsO..",
  "OhHHssO.OhHHssO.",
  "OhHHssO.OhHHssO.",
  "OOOOOOOOOOOOOOOO",
  "OssssssssssssssO",
];

/** Level-end flag, 16×48: banner with a golden crown on a pole. */
export const FLAG: Sprite = [
  "......OO........",
  ".....OYYO.......",
  ".....OyyO.......",
  "......OhOOOOOOO.",
  "......OhORRRRRO.",
  "......OhORRYRRO.",
  "......OhORYYYRO.",
  "......OhORYRYRO.",
  "......OhORRRRRO.",
  "......OhOpRRRpO.",
  "......OhO.ORO...",
  "......OhO..O....",
  ...Array<string>(34).fill("......OhO......."),
  ".....OsssO......",
  "....OOOOOOO.....",
];

/** Checkpoint banner, 16×32. `cloth` is a palette key. */
function checkpoint(cloth: string, shade: string): Sprite {
  return [
    "...OO...........",
    "..OhhO..........",
    "...OhOOOOOOO....",
    `...OhO${cloth.repeat(5)}O....`,
    `...OhO${cloth}${"W".repeat(3)}${cloth}O....`,
    `...OhO${cloth.repeat(5)}O....`,
    `...OhO${shade}${cloth.repeat(3)}${shade}O....`,
    "...OhO.OOO......",
    ...Array<string>(22).fill("...OhO.........."),
    "..OsssO.........",
    ".OOOOOOO........",
  ];
}

export const CHECKPOINT_OFF = checkpoint("s", "O");
export const CHECKPOINT_ON = checkpoint("G", "g");

/** HUD hearts, 7×6. */
export const HEART_FULL: Sprite = [".RR.RR.", "RWRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];
export const HEART_EMPTY: Sprite = [".OO.OO.", "O..O..O", "O.....O", ".O...O.", "..O.O..", "...O..."];

/** Landing dust puff, 3×3. */
export const DUST: Sprite = [".W.", "WhW", ".W."];

// ---------------------------------------------------------------------------
// Touch button icons, 8×8 (drawn on a framed button in textures.ts)
// ---------------------------------------------------------------------------

export const ICON_LEFT: Sprite = [
  "...W....",
  "..WW....",
  ".WWWWWW.",
  "WWWWWWW.",
  ".WWWWWW.",
  "..WW....",
  "...W....",
  "........",
];
export const ICON_RIGHT: Sprite = ICON_LEFT.map((row) => [...row].reverse().join(""));
export const ICON_JUMP: Sprite = [
  "...WW...",
  "..WWWW..",
  ".WWWWWW.",
  "WWWWWWWW",
  "..WWWW..",
  "..WWWW..",
  "..WWWW..",
  "........",
];
export const ICON_SWORD: Sprite = [
  "......WW",
  ".....WWW",
  "....WWW.",
  "...WWW..",
  "W.WWW...",
  ".WWW....",
  ".WW.....",
  "W..W....",
];
export const ICON_PAUSE: Sprite = [
  "........",
  ".WW..WW.",
  ".WW..WW.",
  ".WW..WW.",
  ".WW..WW.",
  ".WW..WW.",
  ".WW..WW.",
  "........",
];

// ---------------------------------------------------------------------------
// Walker enemy: a purple slime (16×16 frames, facing right)
// ---------------------------------------------------------------------------

const EMPTY_ROW = "................";

export const SLIME_FRAMES = {
  walk: [
    [
      ...Array<string>(5).fill(EMPTY_ROW),
      "......OOOO......",
      "....OOVVVVOO....",
      "...OVVMMVVVVO...",
      "..OVVMVVVVVVVO..",
      "..OVVVVWOVWOVO..",
      ".OVVVVVWOVWOVVO.",
      ".OVVVVVVVVVVVVO.",
      ".OVVVVVVVVVVVVO.",
      ".OvVVVVVVVVVVvO.",
      "..OvvvvvvvvvvO..",
      "...OOOOOOOOOO...",
    ],
    [
      ...Array<string>(6).fill(EMPTY_ROW),
      "......OOOO......",
      "...OOOVVVVOOO...",
      "..OVVMMVVVVVVO..",
      ".OVVMVVVVVVVVVO.",
      ".OVVVVVWOVWOVVO.",
      "OVVVVVVWOVWOVVVO",
      "OVVVVVVVVVVVVVVO",
      "OvVVVVVVVVVVVVvO",
      ".OvvvvvvvvvvvvO.",
      "..OOOOOOOOOOOO..",
    ],
  ],
  squashed: [
    [
      ...Array<string>(12).fill(EMPTY_ROW),
      "....OOOOOOOO....",
      "..OOVVWVVWVVOO..",
      ".OVVVVVVVVVVVVO.",
      "OOOOOOOOOOOOOOOO",
    ],
  ],
} as const;

// ---------------------------------------------------------------------------
// Jumper enemy: a blue hopper (16×16 frames, facing right)
// ---------------------------------------------------------------------------

const HOPPER_CROUCH: Sprite = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....OO..OO.....",
  "....OWOOOOWO....",
  "...OBBBBBBBBO...",
  "..OBBhBBBBBBBO..",
  "..OBBBBBBBBBBO..",
  ".OBBBBBBBBBBBBO.",
  ".ObBBBBBBBBBBbO.",
  "OObbbbbbbbbbbbOO",
  "OYYO........OYYO",
];

const HOPPER_AIR: Sprite = [
  "................",
  "................",
  "................",
  "................",
  ".....OO..OO.....",
  "....OWOOOOWO....",
  "...OBBBBBBBBO...",
  "...OBhBBBBBBO...",
  "...OBBBBBBBBO...",
  "...OBBBBBBBBO...",
  "...ObBBBBBBbO...",
  "....ObbbbbbO....",
  "....OYO..OYO....",
  "....OYO..OYO....",
  "...OYYO..OYYO...",
  "................",
];

export const HOPPER_FRAMES = { crouch: [HOPPER_CROUCH], air: [HOPPER_AIR] } as const;

// ---------------------------------------------------------------------------
// Shooter enemy: a stone totem that spits rocks (16×16 frames, facing right)
// ---------------------------------------------------------------------------

const TOTEM_TOP = [
  "................",
  "................",
  "................",
  "................",
  "...OOOOOOOOOO...",
  "..OhhHHHHHHHsO..",
  "..OhHHHHHHHHsO..",
];
const TOTEM_BOTTOM = [
  "..OHHHHHHHOOOO..",
  "..OHHHHHHHHHsO..",
  "..OsHHHHHHHHsO..",
  ".OssssssssssssO.",
  ".OOOOOOOOOOOOOO.",
];

export const TOTEM_FRAMES = {
  idle: [
    [
      ...TOTEM_TOP,
      "..OHHHORHHORsO..",
      "..OHHHHHHHHHsO..",
      "..OHHHHHHOOOOO..",
      "..OHHHHHHOvvvO..",
      ...TOTEM_BOTTOM,
    ],
  ],
  /** Eyes and mouth glow just before it shoots (a warning for the player). */
  charge: [
    [
      ...TOTEM_TOP,
      "..OHHHOWHHOWsO..",
      "..OHHHHHHHHHsO..",
      "..OHHHHHHOOOOO..",
      "..OHHHHHHOYYYO..",
      ...TOTEM_BOTTOM,
    ],
  ],
} as const;

/** The totem's rock, 6×6. */
export const ROCK: Sprite = [".OOOO.", "OhHHsO", "OHhHsO", "OHHssO", "OsssvO", ".OOOO."];

// ---------------------------------------------------------------------------
// Power-up items, 8×8 (CB-6)
// ---------------------------------------------------------------------------

export const ITEM_BOOTS: Sprite = [
  "..OOOO..",
  "..OYYO..",
  "WWOKKO..",
  ".WOKKO..",
  "..OKKOO.",
  ".OKKKKKO",
  ".OKKKKKO",
  ".OOOOOOO",
];

export const ITEM_SHIELD: Sprite = [
  ".OOOOOO.",
  "OBBYYBBO",
  "OBBYYBBO",
  "OYYYYYYO",
  "OBBYYBBO",
  ".OBYYBO.",
  "..OBBO..",
  "...OO...",
];

export const ITEM_AXE: Sprite = [
  "...OOOO.",
  "..OLOhHO",
  "..OLOHHO",
  "..OLOOO.",
  "..OLO...",
  "..OLO...",
  "..OLO...",
  "...O....",
];

/** Rotate a square sprite 90° clockwise. */
function rotate(sprite: Sprite): Sprite {
  const n = sprite.length;
  return sprite.map((_, r) => Array.from({ length: n }, (_, c) => sprite[n - 1 - c][r]).join(""));
}

/** Thrown axe: four quarter turns (rotating whole pixels keeps it crisp). */
export const AXE_SPIN_FRAMES: readonly Sprite[] = [
  ITEM_AXE,
  rotate(ITEM_AXE),
  rotate(rotate(ITEM_AXE)),
  rotate(rotate(rotate(ITEM_AXE))),
];

// ---------------------------------------------------------------------------
// Boss (CB-8): the Slime King, 32×24, facing right
// ---------------------------------------------------------------------------

const SLIME_KING_A: Sprite = [
  "................................",
  "................................",
  "................................",
  "...........Y..Y..Y..Y...........",
  "...........YY.YY.YY.Y...........",
  "...........YYYYYYYYYY...........",
  "...........yYRYyYRYyY...........",
  "...........yyyyyyyyyy...........",
  "..........OOOOOOOOOOOO..........",
  "........OOVVVVVVVVVVVvOO........",
  ".......OVMMVVVVVVVVVVVvvO.......",
  ".....OOVMMVVVVVVVVVVVVvvvOO.....",
  "....OVVVMVVVVVVVVVVVVVVvvvvO....",
  "....OVVVVVVVOOVVVVVVOOVvvvvO....",
  "...OVVVVVVVVWWWVVVVWWWVVvvvvO...",
  "..OVVVVVVVVVWWOVVVVWWOVVvvvvvO..",
  "..OVVVVVVVVVWWOVVVVWWOVVVvvvvO..",
  ".OVVVVVVVVVVVVVVVVVVVVVVVvvvvvO.",
  ".OVVVVVVVVVVVVOVVVVOVVVVVvvvvvO.",
  ".OVVVVVVVVVVVVOOOOOOVVVVVvvvvvO.",
  ".OvvvvvvvvvvvvvvvvvvvvvvvvvvvvO.",
  ".OvvvvvvvvvvvvvvvvvvvvvvvvvvvvO.",
  ".OvvvvvvvvvvvvvvvvvvvvvvvvvvvvO.",
  "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
];

const SLIME_KING_B: Sprite = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "...........Y..Y..Y..Y...........",
  "...........YY.YY.YY.Y...........",
  "...........YYYYYYYYYY...........",
  "...........yYRYyYRYyY...........",
  "...........yyyyyyyyyy...........",
  "..........OOOOOOOOOOOO..........",
  "........OOVVVVVVVVVVVvOO........",
  "......OOVMMVVVVVVVVVVVvvOO......",
  ".....OVVMMVVVVVVVVVVVVVvvvO.....",
  "....OVVVMVVVOOVVVVVVOOVvvvvO....",
  "...OVVVVVVVVWWWVVVVWWWVVvvvvO...",
  "..OVVVVVVVVVWWOVVVVWWOVVvvvvvO..",
  "..OVVVVVVVVVWWOVVVVWWOVVVvvvvO..",
  ".OVVVVVVVVVVVVVVVVVVVVVVVvvvvvO.",
  ".OVVVVVVVVVVVVOVVVVOVVVVVvvvvvO.",
  ".OvvvvvvvvvvvvOOOOOOvvvvvvvvvvO.",
  ".OvvvvvvvvvvvvvvvvvvvvvvvvvvvvO.",
  ".OvvvvvvvvvvvvvvvvvvvvvvvvvvvvO.",
  "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
];

const SLIME_KING_AIR: Sprite = [
  "................................",
  "...........Y..Y..Y..Y...........",
  "...........YY.YY.YY.Y...........",
  "...........YYYYYYYYYY...........",
  "...........yYRYyYRYyY...........",
  "...........yyyyyyyyyy...........",
  "...........OOOOOOOOOO...........",
  "..........OVVVVVVVVVvO..........",
  "........OOMVVVVVVVVVVvOO........",
  ".......OMMVVVVVVVVVVVvvvO.......",
  "......OVMVVVVVVVVVVVVVvvvO......",
  "......OVVVVVVVVVVVVVVVvvvO......",
  ".....OVVVVVVOOVVVVVVOOVvvvO.....",
  ".....OVVVVVVWWWVVVVWWWVvvvO.....",
  "....OVVVVVVVWWOVVVVWWOVvvvvO....",
  "....OVVVVVVVWWOVVVVWWOVvvvvO....",
  "...OVVVVVVVVVVVVVVVVVVVVvvvvO...",
  "...OVVVVVVVVVVOVVVVOVVVVvvvvO...",
  "...OVVVVVVVVVVOOOOOOVVVVvvvvO...",
  "...OVVVVVVVVVVVVVVVVVVVVvvvvO...",
  "...OvvvvvvvvvvvvvvvvvvvvvvvvO...",
  "...OvvvvvvvvvvvvvvvvvvvvvvvvO...",
  "...OvvvvvvvvvvvvvvvvvvvvvvvvO...",
  "..OOOOOOOOOOOOOOOOOOOOOOOOOOOO..",
];

/** Idle (two frames, a slow wobble) and in the air (taller and narrower). */
export const SLIME_KING_FRAMES = {
  idle: [SLIME_KING_A, SLIME_KING_B],
  air: [SLIME_KING_AIR],
} as const;

// ---------------------------------------------------------------------------
// Blocks (WO-10)
// ---------------------------------------------------------------------------

/** A hidden bonus block after it was bumped: steel with a golden gem. */
export const BONUS_BLOCK_USED: Sprite = [
  "OOOOOOOOOOOOOOOO",
  "OhhhhhhhhhhhhhhO",
  "OhHHHHHHHHHHHHsO",
  "OhHsHHHHHHHHsHsO",
  "OhHHHHHOOHHHHHsO",
  "OhHHHHOYYOHHHHsO",
  "OhHHHOYWYyOHHHsO",
  "OhHHOYWYYyyOHHsO",
  "OhHHOYYYYyyOHHsO",
  "OhHHHOYYyyOHHHsO",
  "OhHHHHOyyOHHHHsO",
  "OhHHHHHOOHHHHHsO",
  "OhHsHHHHHHHHsHsO",
  "OhHHHHHHHHHHHHsO",
  "OhsssssssssssssO",
  "OOOOOOOOOOOOOOOO",
];
