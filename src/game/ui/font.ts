import type * as Phaser from "phaser";
import { UI } from "../config";

/**
 * Font for all in-game text. The host page sets it to the site's pixel font
 * (Press Start 2P, made for an 8 px grid, so it stays crisp at 8/16 px).
 * next/font gives the font a generated family name, so it is passed in at
 * runtime instead of hard-coded.
 */
let family: string = UI.TEXT.fontFamily;

export function setUiFont(fontFamily: string): void {
  if (fontFamily) family = fontFamily;
}

/** Default UI text style, with optional overrides. */
export function textStyle(
  overrides: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...UI.TEXT, fontFamily: family, ...overrides };
}
