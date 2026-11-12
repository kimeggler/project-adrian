/**
 * Beatability check for generated levels (REQUIREMENTS_1.md §3.3).
 *
 * Breadth-first search over "standable" cells (a solid tile with free space
 * above and no spike). Edges between cells come from walking, or from a small
 * simulation of the player's real movement — the same constants, the same
 * step order and the same hitbox as the game — for a set of inputs: jump
 * (full / short / none), start speed (standing / running) and when to let go
 * of the direction key. Paths that touch a spike count as failures.
 *
 * The check must never accept a jump that only works pixel-perfectly: Arcade
 * resolves tile corners slightly differently than this simulation (corner
 * snagging). So every move is simulated twice, with a slightly weaker and a
 * slightly stronger knight (SIM_STRENGTHS), and only counts if both land on
 * the same surface. Ledge jumps also start with a few pixels of foothold left.
 *
 * Pure TypeScript, no Phaser.
 */
import { PHYSICS, PLAYER, SPIKES, TILE, WORLD } from "../config";
import type { Level } from "../levels/level";
import { TileId } from "../tiles";

export interface ReachabilityResult {
  reachable: boolean;
  /** Number of standable cells reached from spawn. */
  visited: number;
  /** With `withPath`: the moves from spawn to the flag (for debugging). */
  path?: PathStep[];
}

/** One step of a path: walk to a neighbor cell, or a simulated move. */
export interface PathStep {
  from: Cell;
  to: Cell;
  move?: SimInput;
}

const DT = 1 / PHYSICS.FPS;
const BODY_W = PLAYER.HITBOX_WIDTH;
const BODY_H = PLAYER.HITBOX_HEIGHT;
const EPS = 0.001;
const MAX_SIM_SECONDS = 3;
/** Jump released this early for a short hop (seconds). */
const SHORT_JUMP_HOLD = 0.1;
/** Moments to let go of the direction key mid-air (seconds; Infinity = never). */
const RELEASE_TIMES = [Infinity, 0.25];
/**
 * Jump and run speed of the simulated knight relative to the real one.
 * A move counts only if it works for both: not too short, not too far.
 */
const SIM_STRENGTHS = [0.97, 1.02] as const;
/** How far the body must still overlap the ledge tile when jumping off it (px). */
const LEDGE_FOOTHOLD = 4;

export type Cell = { c: number; r: number };

class Grid {
  readonly w: number;
  readonly h: number;
  private readonly spikeCells = new Set<number>();

  constructor(private readonly level: Level) {
    this.w = level.widthTiles;
    this.h = level.heightTiles;
    for (const s of level.spikes) {
      const c = Math.floor(s.x / TILE);
      const r = Math.round(s.y / TILE) - 1; // spike sits in the tile above the ground
      this.spikeCells.add(r * this.w + c);
    }
  }

  solid(c: number, r: number): boolean {
    if (c < 0 || c >= this.w) return true; // outside: walls
    if (r < 0 || r >= this.h) return false; // above: open sky, below: pit
    return this.level.data[r][c] !== TileId.EMPTY;
  }

  spike(c: number, r: number): boolean {
    return this.spikeCells.has(r * this.w + c);
  }

  standable(c: number, r: number): boolean {
    return (
      c > 0 &&
      c < this.w - 1 &&
      r >= 1 &&
      r < this.h &&
      this.solid(c, r) &&
      !this.solid(c, r - 1) &&
      !this.spike(c, r - 1)
    );
  }

  /** Does the player body overlap any spike hitbox? */
  touchesSpike(left: number, top: number): boolean {
    const c0 = Math.floor(left / TILE);
    const c1 = Math.floor((left + BODY_W - EPS) / TILE);
    const r0 = Math.floor(top / TILE);
    const r1 = Math.floor((top + BODY_H - EPS) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.spike(c, r)) continue;
        const sx = c * TILE + (TILE - SPIKES.HITBOX_WIDTH) / 2;
        const sy = (r + 1) * TILE - SPIKES.HITBOX_HEIGHT;
        if (
          left < sx + SPIKES.HITBOX_WIDTH &&
          left + BODY_W > sx &&
          top < sy + SPIKES.HITBOX_HEIGHT &&
          top + BODY_H > sy
        ) {
          return true;
        }
      }
    }
    return false;
  }
}

export interface SimInput {
  /** Body center x and feet y at the start (standing on a surface). */
  x: number;
  y: number;
  dir: -1 | 1;
  /** Start already running at full speed? */
  running: boolean;
  jump: "none" | "full" | "short";
  /** Let go of the direction key after this many seconds. */
  releaseAt: number;
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

/** Simulate one move. Returns the cell landed on, or null (pit, spike, timeout). */
function simulate(grid: Grid, input: SimInput, strength: number): Cell | null {
  const runSpeed = PHYSICS.RUN_SPEED * strength;
  const jumpVelocity = PHYSICS.JUMP_VELOCITY * strength;
  let left = input.x - BODY_W / 2;
  let top = input.y - BODY_H;
  let vx = input.running ? input.dir * runSpeed : 0;
  let vy = 0;
  // Like the game, the jump press is handled after the first physics step.
  let pendingJump = input.jump !== "none";
  let jumpCuttable = false;
  let airborne = false;
  let grounded = true;
  const bottomLimit = grid.h * TILE + WORLD.PIT_MARGIN;

  for (let t = 0; t < MAX_SIM_SECONDS; t += DT) {
    // --- Arcade body update: gravity, cap, move, resolve against tiles. ---
    vy = Math.min(vy + PHYSICS.GRAVITY * DT, PHYSICS.MAX_FALL_SPEED);

    left += vx * DT;
    const r0 = Math.floor(top / TILE);
    const r1 = Math.floor((top + BODY_H - EPS) / TILE);
    if (vx > 0) {
      const c = Math.floor((left + BODY_W - EPS) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (grid.solid(c, r)) {
          left = c * TILE - BODY_W;
          vx = 0;
          break;
        }
      }
    } else if (vx < 0) {
      const c = Math.floor(left / TILE);
      for (let r = r0; r <= r1; r++) {
        if (grid.solid(c, r)) {
          left = (c + 1) * TILE;
          vx = 0;
          break;
        }
      }
    }

    top += vy * DT;
    grounded = false;
    const c0 = Math.floor(left / TILE);
    const c1 = Math.floor((left + BODY_W - EPS) / TILE);
    if (vy > 0) {
      const r = Math.floor((top + BODY_H - EPS) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (grid.solid(c, r)) {
          top = r * TILE - BODY_H;
          vy = 0;
          grounded = true;
          break;
        }
      }
    } else if (vy < 0) {
      const r = Math.floor(top / TILE);
      for (let c = c0; c <= c1; c++) {
        if (grid.solid(c, r)) {
          top = (r + 1) * TILE;
          vy = 0;
          break;
        }
      }
    }

    if (grid.touchesSpike(left, top)) return null;
    if (top > bottomLimit) return null;

    if (grounded) {
      if (airborne) return landingCell(grid, left, top);
    } else {
      airborne = true;
    }

    // --- Controller (runs after the physics step, like WORLD_STEP). ---
    const time = t + DT;
    const dir = time < input.releaseAt ? input.dir : 0;
    const control = grounded ? 1 : PHYSICS.AIR_CONTROL;
    let rate: number;
    if (dir === 0) rate = PHYSICS.DECELERATION;
    else if (Math.sign(vx) === -dir) rate = Math.max(PHYSICS.ACCELERATION, PHYSICS.DECELERATION);
    else rate = PHYSICS.ACCELERATION;
    vx = approach(vx, dir * runSpeed, rate * control * DT);

    if (pendingJump) {
      if (!grounded) return null; // walked off before the jump: not this move
      vy = jumpVelocity;
      pendingJump = false;
      jumpCuttable = true;
    } else if (jumpCuttable) {
      const held = input.jump === "full" || time < SHORT_JUMP_HOLD;
      if (vy >= 0) jumpCuttable = false;
      else if (!held) {
        vy *= PHYSICS.JUMP_CUT_FACTOR;
        jumpCuttable = false;
      }
    }

    // Walked into a wall without leaving the ground: nothing new here.
    if (!airborne && vx === 0 && dir === 0) return null;
  }
  return null;
}

function landingCell(grid: Grid, left: number, top: number): Cell | null {
  const r = Math.round((top + BODY_H) / TILE);
  const center = Math.floor((left + BODY_W / 2) / TILE);
  const candidates = [
    center,
    Math.floor(left / TILE),
    Math.floor((left + BODY_W - EPS) / TILE),
  ];
  for (const c of candidates) {
    if (grid.standable(c, r)) return { c, r };
  }
  return null;
}

/**
 * Simulate a move with a weaker and a stronger knight. Returns the landing
 * cell of the weaker one if both land on the same surface, else null.
 */
function robustMove(grid: Grid, input: SimInput): Cell | null {
  const [weak, strong] = SIM_STRENGTHS;
  const a = simulate(grid, input, weak);
  if (!a) return null;
  const b = simulate(grid, input, strong);
  if (!b || b.r !== a.r || Math.abs(b.c - a.c) > 2) return null;
  // Same row, but make sure it's the same surface (no pit in between).
  const [lo, hi] = a.c < b.c ? [a.c, b.c] : [b.c, a.c];
  for (let c = lo; c <= hi; c++) if (!grid.standable(c, a.r)) return null;
  return a;
}

/** All simulated moves starting from a standable cell. */
function movesFrom(grid: Grid, { c, r }: Cell): SimInput[] {
  const inputs: SimInput[] = [];
  const y = r * TILE;
  for (const dir of [-1, 1] as const) {
    const nextFlat = grid.standable(c + dir, r);
    const wallAhead = grid.solid(c + dir, r - 1);
    const starts = [c * TILE + TILE / 2];
    if (wallAhead) {
      // Pressed against the wall: best spot to jump up a step.
      starts.push(dir > 0 ? (c + 1) * TILE - BODY_W / 2 : c * TILE + BODY_W / 2);
    } else if (!nextFlat) {
      // At the ledge with only a small foothold left: longest jumps.
      starts.push(
        dir > 0
          ? (c + 1) * TILE + BODY_W / 2 - LEDGE_FOOTHOLD
          : c * TILE - BODY_W / 2 + LEDGE_FOOTHOLD,
      );
    }
    const canRun = grid.standable(c - dir, r);
    const jumps: SimInput["jump"][] = nextFlat ? ["full", "short"] : ["full", "short", "none"];

    for (const x of starts) {
      for (const running of canRun ? [false, true] : [false]) {
        for (const jump of jumps) {
          for (const releaseAt of RELEASE_TIMES) {
            inputs.push({ x, y, dir, running, jump, releaseAt });
          }
        }
      }
    }
  }
  return inputs;
}

/** Can the flag be reached from the spawn point? */
export function checkReachability(level: Level, withPath = false): ReachabilityResult {
  const grid = new Grid(level);
  const start: Cell = {
    c: Math.floor(level.spawn.x / TILE),
    r: Math.round(level.spawn.y / TILE),
  };
  const goalCol = Math.floor(level.flag.x / TILE);
  if (!grid.standable(start.c, start.r)) return { reachable: false, visited: 0 };

  const key = (cell: Cell) => cell.r * grid.w + cell.c;
  const visited = new Set<number>([key(start)]);
  const parent = new Map<number, PathStep>();
  const queue: Cell[] = [start];

  const visit = (cell: Cell, from: Cell, move?: SimInput) => {
    const k = key(cell);
    if (visited.has(k)) return;
    visited.add(k);
    if (withPath) parent.set(k, { from, to: cell, move });
    queue.push(cell);
  };

  const pathTo = (cell: Cell): PathStep[] => {
    const steps: PathStep[] = [];
    for (let step = parent.get(key(cell)); step; step = parent.get(key(step.from))) {
      steps.unshift(step);
    }
    return steps;
  };

  while (queue.length > 0) {
    const cell = queue.shift()!;
    if (cell.c >= goalCol) {
      return {
        reachable: true,
        visited: visited.size,
        path: withPath ? pathTo(cell) : undefined,
      };
    }

    // Walking along the same surface.
    for (const dc of [-1, 1]) {
      const next = { c: cell.c + dc, r: cell.r };
      if (grid.standable(next.c, next.r)) visit(next, cell);
    }
    // Jumps and walk-offs.
    for (const input of movesFrom(grid, cell)) {
      const landed = robustMove(grid, input);
      if (landed) visit(landed, cell, input);
    }
  }
  return { reachable: false, visited: visited.size };
}
