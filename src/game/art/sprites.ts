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

const PLUME = {
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
  plume: readonly string[];
  legs: readonly string[];
  /** Move the upper body up by this many pixels (running bounce). */
  bob?: number;
  /** Move head and body left by this many pixels (recoil when hurt). */
  lean?: number;
  /** Replace the eye pixel (e.g. "W" for a wide, surprised eye). */
  eye?: string;
  body?: readonly string[];
}

function knight({ plume, legs, bob = 0, lean = 0, eye = "O", body = BODY }: KnightPose): Sprite {
  let upper = [...plume, ...HELMET, ...body];
  const eyeRow = upper[EYE.row];
  upper[EYE.row] = eyeRow.slice(0, EYE.col) + eye + eyeRow.slice(EYE.col + 1);
  if (lean > 0) upper = upper.map((r) => r.slice(lean) + ".".repeat(lean));
  if (bob > 0) {
    // Shift up and repeat the last body row so there is no gap above the legs.
    upper = [...upper.slice(bob), ...Array(bob).fill(upper[upper.length - 1])];
  }
  return [...upper, ...legs];
}

/** Knight animation frames, in spritesheet order. */
export const KNIGHT_FRAMES = {
  idle: [
    knight({ plume: PLUME.rest, legs: LEGS.idle }),
    knight({ plume: PLUME.sway, legs: LEGS.idle }),
  ],
  run: [
    knight({ plume: PLUME.sway, legs: LEGS.strideA }),
    knight({ plume: PLUME.sway, legs: LEGS.pass, bob: 1 }),
    knight({ plume: PLUME.sway, legs: LEGS.strideB }),
    knight({ plume: PLUME.sway, legs: LEGS.pass, bob: 1 }),
  ],
  jump: [knight({ plume: PLUME.sway, legs: LEGS.tuck })],
  fall: [knight({ plume: PLUME.up, legs: LEGS.dangle })],
  hurt: [knight({ plume: PLUME.up, legs: LEGS.idle, lean: 1, eye: "W" })],
  attack: [knight({ plume: PLUME.sway, legs: LEGS.strideA, body: BODY_ATTACK })],
} as const;

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
