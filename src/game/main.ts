import * as Phaser from "phaser";
import { getAudioContext } from "@/lib/audioContext";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { LevelCompleteScene } from "./scenes/LevelCompleteScene";
import { PauseScene } from "./scenes/PauseScene";
import { UIScene } from "./scenes/UIScene";
import { START_DATA_KEY } from "./events";
import type { LevelStartData } from "./types";

/**
 * Creates the Phaser game inside `parent`.
 * Only call this in the browser (never during SSR).
 */
export function createGame(parent: HTMLElement, start: LevelStartData): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    banner: false,
    // Share the app's AudioContext, unlocked by the "Start game" click (AU-2).
    audio: { context: getAudioContext() },
    render: {
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      // We do our own integer scaling (see fitIntegerZoom).
      mode: Phaser.Scale.NONE,
      zoom: 1,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: PHYSICS.GRAVITY },
        fps: PHYSICS.FPS,
        fixedStep: true,
        debug: false,
      },
    },
    scene: [
      BootScene,
      GameScene,
      UIScene,
      PauseScene,
      GameOverScene,
      LevelCompleteScene,
    ],
  });

  game.registry.set(START_DATA_KEY, start);
  // A previous game may have suspended the shared context; this only
  // succeeds once the user has interacted with the page, which is fine.
  void getAudioContext()?.resume().catch(() => {});
  fitIntegerZoom(game, parent);
  return game;
}

/**
 * Scale the canvas by the largest whole number of *device* pixels per game
 * pixel that fits in `parent`, so every game pixel is the same size even on
 * 1.5× or 2× displays. The parent centers the canvas (letterboxing).
 */
export function fitIntegerZoom(game: Phaser.Game, parent: HTMLElement): void {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(
    (parent.clientWidth * dpr) / GAME_WIDTH,
    (parent.clientHeight * dpr) / GAME_HEIGHT,
  );
  const deviceFactor = Math.max(1, Math.floor(fit));
  game.scale.setZoom(deviceFactor / dpr);
}
