import * as Phaser from "phaser";
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import {
  GameOverScene,
  LevelCompleteScene,
  PauseScene,
} from "./scenes/StubScenes";
import { UIScene } from "./scenes/UIScene";

/**
 * Creates the Phaser game inside `parent`.
 * Only call this in the browser (never during SSR).
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    banner: false,
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
